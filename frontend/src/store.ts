import { configureStore } from '@reduxjs/toolkit';
import interactionReducer from './features/interactionSlice';
import chatReducer from './features/chatSlice';

export const store = configureStore({
  reducer: {
    interaction: interactionReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
