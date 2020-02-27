import React from "react";
import ReactDOM from "react-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import App from "./components/App";
import "./styles/styles.scss";
import configureStore from "./store/configureStore";

const { store, persistor } = configureStore();

const jsx = (
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <App />
    </PersistGate>
  </Provider>
);

ReactDOM.render(jsx, document.querySelector("#root"));
