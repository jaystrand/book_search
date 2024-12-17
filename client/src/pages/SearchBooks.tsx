import { useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import { Container, Col, Form, Button, Card, Row } from 'react-bootstrap';

import { SAVE_BOOK } from '../utils/mutations';
import { SEARCH_GOOGLE_BOOKS } from '../utils/queries';
import Auth from '../utils/auth';
import type { Book, GoogleAPIBook } from '../models/Book';

const SearchBooks = () => {
  const [searchedBooks, setSearchedBooks] = useState<Book[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [savedBookIds, setSavedBookIds] = useState(
    JSON.parse(localStorage.getItem('saved_books') || '[]')
  );

  const [searchBooks, { loading }] = useLazyQuery(SEARCH_GOOGLE_BOOKS, {
    onCompleted: (data) => {
      const bookData = data.searchBooks.map((book: GoogleAPIBook) => ({
        bookId: book.id,
        authors: book.volumeInfo.authors || ['No author to display'],
        title: book.volumeInfo.title,
        description: book.volumeInfo.description,
        image: book.volumeInfo.imageLinks?.thumbnail || '',
      }));
      setSearchedBooks(bookData);
    },
    onError: (error) => {
      console.error('Search books error:', error);
    }
  });

  const [saveBook] = useMutation(SAVE_BOOK, {
    onCompleted: (data) => {
      const updatedSavedBookIds = [...savedBookIds, data.saveBook.bookId];
      setSavedBookIds(updatedSavedBookIds);
      localStorage.setItem('saved_books', JSON.stringify(updatedSavedBookIds));
    },
    onError: (error) => {
      console.error('Save book error:', error);
    }
  });

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!searchInput) return;

    searchBooks({ variables: { query: searchInput } });
    setSearchInput('');
  };

  const handleSaveBook = async (bookId: string) => {
    const bookToSave = searchedBooks.find((book) => book.bookId === bookId);

    if (!bookToSave) return;

    try {
      await saveBook({
        variables: { 
          bookData: { 
            bookId: bookToSave.bookId,
            authors: bookToSave.authors,
            title: bookToSave.title,
            description: bookToSave.description,
            image: bookToSave.image
          } 
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="text-light bg-dark p-5">
        <Container>
          <h1>Search for Books!</h1>
          <Form onSubmit={handleFormSubmit}>
            <Row>
              <Col xs={12} md={8}>
                <Form.Control
                  name='searchInput'
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  type='text'
                  size='lg'
                  placeholder='Search for a book'
                />
              </Col>
              <Col xs={12} md={4}>
                <Button type='submit' variant='success' size='lg' disabled={loading}>
                  {loading ? 'Searching...' : 'Submit Search'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Container>
      </div>

      <Container>
        <h2 className='pt-5'>
          {searchedBooks.length
            ? `Viewing ${searchedBooks.length} results:`
            : 'Search for a book to begin'}
        </h2>
        <Row>
          {searchedBooks.map((book) => (
            <Col md="4" key={book.bookId}>
              <Card border='dark'>
                {book.image ? (
                  <Card.Img src={book.image} alt={`The cover for ${book.title}`} variant='top' />
                ) : null}
                <Card.Body>
                  <Card.Title>{book.title}</Card.Title>
                  <p className='small'>Authors: {book.authors.join(', ')}</p>
                  <Card.Text>{book.description}</Card.Text>
                  {Auth.loggedIn() && (
                    <Button
                      disabled={savedBookIds?.includes(book.bookId)}
                      className='btn-block btn-info'
                      onClick={() => handleSaveBook(book.bookId)}>
                      {savedBookIds?.includes(book.bookId)
                        ? 'This book has been saved!'
                        : 'Save this Book!'}
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </>
  );
};

export default SearchBooks;