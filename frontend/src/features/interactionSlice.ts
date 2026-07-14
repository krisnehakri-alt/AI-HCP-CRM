import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface InteractionState {
  hcp_name: string;
  interaction_type: string;
  date: string;
  time: string;
  attendees: string;
  topics_discussed: string;
  materials_shared: string;
  samples_distributed: string;
  sentiment: string;
  outcomes: string;
  follow_up_actions: string;
  ai_suggested_follow_ups: string;
}

const initialState: InteractionState = {
  hcp_name: '',
  interaction_type: '',
  date: '',
  time: '',
  attendees: '',
  topics_discussed: '',
  materials_shared: '',
  samples_distributed: '',
  sentiment: '',
  outcomes: '',
  follow_up_actions: '',
  ai_suggested_follow_ups: '',
};

export const interactionSlice = createSlice({
  name: 'interaction',
  initialState,
  reducers: {
    updateField: (state, action: PayloadAction<{ field: keyof InteractionState; value: string }>) => {
      state[action.payload.field] = action.payload.value;
    },
    updateMultipleFields: (state, action: PayloadAction<Partial<InteractionState>>) => {
      return { ...state, ...action.payload };
    },
    resetForm: () => initialState,
  },
});

export const { updateField, updateMultipleFields, resetForm } = interactionSlice.actions;
export default interactionSlice.reducer;
