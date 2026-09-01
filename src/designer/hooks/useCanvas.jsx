import { createContext, useState, useContext, useCallback } from "react";
import { useSelector } from "react-redux";

const CanvasContext = createContext(null);

export const CanvasProvider = ({ children }) => {
  const [frontCanvas,    setFrontCanvas]    = useState(null);
  const [backCanvas,     setBackCanvas]     = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);

  // selectedView viene del store de Redux
  const selectedView = useSelector((s) => s.designer?.selectedView || "front");

  // activeCanvas SIEMPRE apunta al canvas de la vista activa
  const activeCanvas = selectedView === "front" ? frontCanvas : backCanvas;

  // setActiveCanvas lo dejamos como no-op para no romper código existente
  const setActiveCanvas = useCallback(() => {}, []);

  return (
    <CanvasContext.Provider value={{
      frontCanvas,    setFrontCanvas,
      backCanvas,     setBackCanvas,
      activeCanvas,   setActiveCanvas,
      selectedObject, setSelectedObject,
    }}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => useContext(CanvasContext);
