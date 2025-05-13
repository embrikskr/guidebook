import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './index.css';

function App() {
  const [guides, setGuides] = useState([]);
  const [title, setTitle] = useState('');
  const [elements, setElements] = useState([]); // Elementer i dra-og-slipp-editoren
  const [newElement, setNewElement] = useState(''); // Input for å legge til nytt element

  // Hent guider fra backend når komponenten lastes
  useEffect(() => {
    axios.get('http://localhost:5000/api/guides')
      .then((response) => {
        setGuides(response.data);
      })
      .catch((error) => {
        console.error('Feil ved henting av guider:', error);
      });
  }, []);

  // Håndter dra-og-slipp
  const handleDragEnd = (result) => {
    if (!result.destination) return; // Hvis elementet slippes utenfor en droppable

    const reorderedElements = [...elements];
    const [movedElement] = reorderedElements.splice(result.source.index, 1);
    reorderedElements.splice(result.destination.index, 0, movedElement);
    setElements(reorderedElements);
  };

  // Legg til nytt element i guiden
  const addElement = (e) => {
    e.preventDefault();
    if (!newElement) return;
    setElements([...elements, { id: `${elements.length + 1}`, content: newElement }]);
    setNewElement('');
  };

  // Lagre guiden til backend
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || elements.length === 0) return;

    const content = elements.map((el) => el.content).join('\n'); // Kombiner elementer til en streng
    axios.post('http://localhost:5000/api/guides', { title, content })
      .then((response) => {
        setGuides([...guides, response.data]); // Legg til ny guide i listen
        setTitle(''); // Tøm skjemaet
        setElements([]);
      })
      .catch((error) => {
        console.error('Feil ved lagring av guide:', error);
      });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl text-center mb-4">Guidebook SaaS</h1>

      {/* Dra-og-slipp-editor */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <label className="block text-gray-700">Tittel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700">Legg til element</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newElement}
              onChange={(e) => setNewElement(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Skriv inn tekst..."
            />
            <button
              type="button"
              onClick={addElement}
              className="bg-green-500 text-white p-2 rounded"
            >
              Legg til
            </button>
          </div>
        </div>

        {/* Dra-og-slipp-liste */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="elements">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="min-h-[100px] p-4 border rounded mb-4"
              >
                {elements.length === 0 ? (
                  <p className="text-gray-500">Legg til elementer...</p>
                ) : (
                  elements.map((element, index) => (
                    <Draggable key={element.id} draggableId={element.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="p-2 mb-2 bg-gray-100 border rounded flex justify-between items-center"
                        >
                          <span>{element.content}</span>
                          <button
                            onClick={() => setElements(elements.filter((el) => el.id !== element.id))}
                            className="text-red-500 hover:text-red-700"
                          >
                            Slett
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        <button type="submit" className="bg-blue-500 text-white p-2 rounded">
          Lagre guide
        </button>
      </form>

      {/* Vis liste over guider */}
      <div>
        <h2 className="text-2xl mb-4">Dine guider</h2>
        {guides.length === 0 ? (
          <p>Ingen guider ennå.</p>
        ) : (
          <ul>
            {guides.map((guide) => (
              <li key={guide._id} className="mb-4 p-4 border rounded">
                <h3 className="text-xl">{guide.title}</h3>
                <p>{guide.content}</p>
                <p className="text-gray-500 text-sm">
                  Opprettet: {new Date(guide.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;