import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // eslint-disable-next-line no-param-reassign
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const createElementId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2, 10);
};

const AuthView = ({ onSuccess }) => {
  const [mode, setMode] = useState('login');
  const [formValues, setFormValues] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      setLoading(true);
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login'
        ? { email: formValues.email, password: formValues.password }
        : {
          name: formValues.name,
          email: formValues.email,
          password: formValues.password,
        };

      const { data } = await api.post(endpoint, payload);
      onSuccess(data);
    } catch (err) {
      const message = err.response?.data?.message || 'Noe gikk galt. Prøv igjen.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="app-title">Guidebook</h1>
        <p className="app-subtitle">Din digitale vertsbok for Airbnb, hotell og ferieboliger.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <label className="form-field">
              <span>Navn</span>
              <input
                name="name"
                type="text"
                value={formValues.name}
                onChange={handleChange}
                placeholder="Navnet som vises til gjestene dine"
                required
              />
            </label>
          )}

          <label className="form-field">
            <span>E-post</span>
            <input
              name="email"
              type="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="din@bedrift.no"
              required
            />
          </label>

          <label className="form-field">
            <span>Passord</span>
            <input
              name="password"
              type="password"
              value={formValues.password}
              onChange={handleChange}
              placeholder="Minst 6 tegn"
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Sender...' : mode === 'login' ? 'Logg inn' : 'Opprett konto'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? 'Har du ikke en konto?' : 'Har du allerede en konto?'}
          {' '}
          <button type="button" onClick={toggleMode} className="link-button">
            {mode === 'login' ? 'Registrer deg her' : 'Logg inn'}
          </button>
        </p>
      </div>
    </div>
  );
};

const GuideBuilder = ({ onCreate }) => {
  const [title, setTitle] = useState('');
  const [elements, setElements] = useState([]);
  const [newElement, setNewElement] = useState('');
  const [error, setError] = useState('');

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const reordered = Array.from(elements);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setElements(reordered);
  };

  const handleAddElement = () => {
    if (!newElement.trim()) {
      return;
    }

    setElements((prev) => [
      ...prev,
      {
        id: createElementId(),
        content: newElement.trim(),
      },
    ]);
    setNewElement('');
  };

  const handleRemoveElement = (id) => {
    setElements((prev) => prev.filter((element) => element.id !== id));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Skriv inn en tittel for guiden.');
      return;
    }

    if (elements.length === 0) {
      setError('Legg til minst én seksjon før du lagrer.');
      return;
    }

    try {
      const sections = elements.map((element) => element.content);
      await onCreate({ title: title.trim(), sections });
      setTitle('');
      setElements([]);
      setNewElement('');
    } catch (err) {
      setError(err.message || 'Kunne ikke lagre guiden');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="builder-card">
      <h2>Lag en ny guide</h2>
      <p className="builder-description">
        Sett sammen en flott digital guide ved å legge til de viktigste detaljene gjestene dine trenger.
      </p>

      <label className="form-field">
        <span>Tittel</span>
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="F.eks. Velkommen til Solsiden Lodge"
          required
        />
      </label>

      <label className="form-field">
        <span>Legg til seksjon</span>
        <div className="row">
          <input
            type="text"
            value={newElement}
            onChange={(event) => setNewElement(event.target.value)}
            placeholder="Husregler, WiFi-informasjon, anbefalte restauranter..."
          />
          <button type="button" onClick={handleAddElement} className="secondary-button">
            Legg til
          </button>
        </div>
      </label>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="sections">
          {(provided) => (
            <div className="sections-list" ref={provided.innerRef} {...provided.droppableProps}>
              {elements.length === 0 && <p className="sections-placeholder">Ingen seksjoner enda. Legg til innhold for å komme i gang.</p>}
              {elements.map((element, index) => (
                <Draggable key={element.id} draggableId={element.id} index={index}>
                  {(dragProvided) => (
                    <div
                      className="section-item"
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                    >
                      <span>{element.content}</span>
                      <button type="button" onClick={() => handleRemoveElement(element.id)} className="link-button danger">
                        Slett
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="primary-button">
        Publiser guide
      </button>
    </form>
  );
};

const GuidesList = ({ guides, onRefresh }) => {
  const shareBaseUrl = useMemo(() => `${window.location.origin}/guide/`, []);

  return (
    <div className="guides-card">
      <div className="guides-header">
        <h2>Dine guider</h2>
        <button type="button" onClick={onRefresh} className="link-button">
          Oppdater
        </button>
      </div>
      {guides.length === 0 ? (
        <p>Du har ikke laget noen guider enda. Publiser din første guide for å dele den med gjestene dine.</p>
      ) : (
        <ul className="guides-list">
          {guides.map((guide) => (
            <li key={guide._id} className="guides-item">
              <div>
                <h3>{guide.title}</h3>
                <p className="guide-meta">Sist oppdatert {new Date(guide.updatedAt).toLocaleString('no-NO')}</p>
                <details>
                  <summary>Vis seksjoner</summary>
                  <ol>
                    {guide.sections.map((section, index) => (
                      <li key={index}>{section}</li>
                    ))}
                  </ol>
                </details>
              </div>
              <div className="guide-actions">
                <span className="share-label">Delingslenke</span>
                <input
                  readOnly
                  value={`${shareBaseUrl}${guide.slug}`}
                  onFocus={(event) => event.target.select()}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/guides');
      setGuides(data);
    } catch (err) {
      const message = err.response?.data?.message || 'Kunne ikke laste guider.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const handleCreate = async ({ title, sections }) => {
    const { data } = await api.post('/guides', { title, sections });
    setGuides((prev) => [data, ...prev]);
    setSuccessMessage('Guiden er publisert! Del lenken med gjestene dine.');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Hei, {user.name}</h1>
          <p>Bygg og del digitale velkomstguider på minutter.</p>
        </div>
        <button type="button" onClick={onLogout} className="link-button">
          Logg ut
        </button>
      </header>

      {successMessage && <div className="success-banner">{successMessage}</div>}
      {error && <div className="error-banner">{error}</div>}

      <div className="dashboard-grid">
        <GuideBuilder onCreate={handleCreate} />
        <div className="guides-column">
          {loading ? <p>Laster guider...</p> : <GuidesList guides={guides} onRefresh={fetchGuides} />}
        </div>
      </div>
    </div>
  );
};

const PublicGuideView = () => {
  const { slug } = useParams();
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGuide = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/guides/share/${slug}`);
        setGuide(data);
      } catch (err) {
        const message = err.response?.data?.message || 'Guiden ble ikke funnet.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [slug]);

  if (loading) {
    return (
      <div className="public-wrapper">
        <div className="public-card">
          <p>Laster guide...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="public-wrapper">
        <div className="public-card">
          <h1>Fant ikke guiden</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-wrapper">
      <article className="public-card">
        <header className="public-header">
          <h1>{guide.title}</h1>
          {guide.hostName && <p className="public-host">Fra {guide.hostName}</p>}
          <p className="public-updated">Sist oppdatert {new Date(guide.updatedAt).toLocaleDateString('no-NO')}</p>
        </header>
        <ol className="public-sections">
          {guide.sections.map((section, index) => (
            <li key={index}>
              <h2>Seksjon {index + 1}</h2>
              <p>{section}</p>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
};

const AppRoutes = ({ user, onAuthSuccess, onLogout }) => (
  <Routes>
    <Route path="/guide/:slug" element={<PublicGuideView />} />
    <Route
      path="/"
      element={user ? <Dashboard user={user} onLogout={onLogout} /> : <AuthView onSuccess={onAuthSuccess} />}
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      return;
    }

    if (!user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, [user]);

  const handleAuthSuccess = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <AppRoutes user={user} onAuthSuccess={handleAuthSuccess} onLogout={handleLogout} />
    </Router>
  );
};

export default App;
