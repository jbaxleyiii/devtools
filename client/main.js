import { render } from "react-dom";
import { BrowserRouter } from "react-router-dom";

import { ApolloProvider } from "react-apollo";
import { ApolloClient } from "apollo-client";
import { createHttpLink } from "apollo-link-http";
import { InMemoryCache } from "apollo-cache-inmemory";

import { App } from "/imports/App";

const client = new ApolloClient({
  link: createHttpLink({ uri: "/graphql" }),
  cache: new InMemoryCache(),
});

const WrappedApp = (
  <ApolloProvider client={client}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ApolloProvider>
);

render(WrappedApp, document.getElementById("app"));
