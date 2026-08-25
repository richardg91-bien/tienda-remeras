import { createContext, useContext, useReducer, useEffect } from "react";

const CartContext = createContext(null);

// ── Reducer ────────────────────────────────────────────
function cartReducer(state, action) {
  switch (action.type) {

    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) => i.id === action.payload.id && i.selectedSize === action.payload.selectedSize
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.payload.id && i.selectedSize === action.payload.selectedSize
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((_, idx) => idx !== action.payload),
      };

    case "UPDATE_QUANTITY": {
      const { index, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((_, idx) => idx !== index),
        };
      }
      return {
        ...state,
        items: state.items.map((item, idx) =>
          idx === index ? { ...item, quantity } : item
        ),
      };
    }

    case "CLEAR":
      return { ...state, items: [] };

    case "TOGGLE_OPEN":
      return { ...state, isOpen: !state.isOpen };

    case "SET_OPEN":
      return { ...state, isOpen: action.payload };

    default:
      return state;
  }
}

const initialState = {
  items: [],
  isOpen: false,
};

// ── Provider ────────────────────────────────────────────
export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem("cart");
      return saved ? { ...init, items: JSON.parse(saved) } : init;
    } catch {
      return init;
    }
  });

  // Persistir en localStorage
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(state.items));
  }, [state.items]);

  const addItem     = (product, selectedSize) =>
    dispatch({ type: "ADD_ITEM", payload: { ...product, selectedSize } });

  const removeItem  = (index) =>
    dispatch({ type: "REMOVE_ITEM", payload: index });

  const updateQty   = (index, quantity) =>
    dispatch({ type: "UPDATE_QUANTITY", payload: { index, quantity } });

  const clearCart   = () => dispatch({ type: "CLEAR" });
  const toggleCart  = () => dispatch({ type: "TOGGLE_OPEN" });
  const openCart    = () => dispatch({ type: "SET_OPEN", payload: true });
  const closeCart   = () => dispatch({ type: "SET_OPEN", payload: false });

  const totalItems  = state.items.reduce((acc, i) => acc + i.quantity, 0);
  const totalPrice  = state.items.reduce((acc, i) => acc + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        totalItems,
        totalPrice,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        toggleCart,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────
export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
