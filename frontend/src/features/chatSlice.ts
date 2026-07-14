import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  loggedSuccess: boolean;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  loggedSuccess: false,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setLoggedSuccess: (state, action: PayloadAction<boolean>) => {
      state.loggedSuccess = action.payload;
    },
    resetChat: () => initialState,
  },
});

export const { addMessage, setLoading, setLoggedSuccess, resetChat } = chatSlice.actions;
export default chatSlice.reducer;
