import { configureStore } from "@reduxjs/toolkit";
import designerReducer from "./designerSlice.js";

// Store aislado solo para el módulo designer
// No interfiere con el resto de la app (CartContext, AuthContext)
const designerStore = configureStore({
  reducer: {
    designer: designerReducer,
  },
});

export default designerStore;
