import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  selectedType:  "crew-neck",
  tshirtColor:   "#FFFFFF",
  selectedView:  "front",
};

export const designerSlice = createSlice({
  name: "designer",
  initialState,
  reducers: {
    setSelectedType:  (state, action) => { state.selectedType  = action.payload; },
    setTshirtColor:   (state, action) => { state.tshirtColor   = action.payload; },
    setSelectedView:  (state, action) => { state.selectedView  = action.payload; },
  },
});

export const { setSelectedType, setTshirtColor, setSelectedView } = designerSlice.actions;
export default designerSlice.reducer;
