import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/index.css";
import App from "./App.js";

import { AuthProvider } from "./context/AuthContext.js";
import { UserProfileProvider } from "./context/UserProfileContext.js";
import { MRVIProvider } from "./context/MRVIContext.js";
import { ProjectProvider } from "./context/ProjectContext.js";
import { SubscriptionProvider } from "./context/SubscriptionContext.js";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <UserProfileProvider>
        <MRVIProvider>
          <SubscriptionProvider>
            <ProjectProvider>
              <App />
            </ProjectProvider>
          </SubscriptionProvider>
        </MRVIProvider>
      </UserProfileProvider>
    </AuthProvider>
  </React.StrictMode>
);



