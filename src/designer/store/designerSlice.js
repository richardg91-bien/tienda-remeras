import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedType:  "crew-neck",
  tshirtColor:   "#FFFFFF",
  selectedView:  "front",
  selectedProductRef: "tee-classic",
  selectedSurfaceId: "front",
};

export const designerSlice = createSlice({
  name: "designer",
  initialState,
  reducers: {
    setSelectedType:  (state, action) => { state.selectedType  = action.payload; },
    setTshirtColor:   (state, action) => { state.tshirtColor   = action.payload; },
    setSelectedView:  (state, action) => { state.selectedView  = action.payload; },
    setSelectedProductRef: (state, action) => { state.selectedProductRef = action.payload; },
    setSelectedSurfaceId: (state, action) => { state.selectedSurfaceId = action.payload; },
  },
});

export const {
  setSelectedType,
  setTshirtColor,
  setSelectedView,
  setSelectedProductRef,
  setSelectedSurfaceId,
} = designerSlice.actions;
export default designerSlice.reducer;
