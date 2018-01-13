import React, { Component } from "react";
import { flatten } from "ramda";
import chroma from "chroma-js";
import { graphql, withApollo } from "react-apollo";
import gql from "graphql-tag";
import { introspectionQuery } from "graphql/utilities";
import { Link, Route, Switch } from "react-router-dom";
import {
  InteractiveForceGraph,
  ForceGraphNode,
  ForceGraphLink,
} from "react-vis-force";
import { apply, pipe, toPairs, filter, fromPairs } from "ramda";
import { scaleLinear } from "d3-scale";
import sizeMe from "react-sizeme";
import { withState } from "recompose";

const filterWithKeys = (pred, obj) =>
  pipe(toPairs, filter(apply(pred)), fromPairs)(obj);

const POSTS_QUERY = gql`
  query Posts {
    posts {
      id
      title
      author {
        firstName
        id
        lastName
      }
    }
  }
`;

const INTROSPECTION = gql(introspectionQuery);
const withSchema = graphql(INTROSPECTION, { name: "__schema" });

const withPosts = graphql(POSTS_QUERY);

class SizeRenderProp extends Component {
  render() {
    return this.props.render(this.props.size);
  }
}

const Size = sizeMe({
  monitorWidth: true,
  monitorHeight: true,
  refreshRate: 30,
  refreshMode: "debounce",
})(SizeRenderProp);

const Posts = withApollo(
  withSchema(
    withPosts(
      withState(
        "selection",
        "updateSelection",
        null
      )(
        ({
          client,
          __schema: { __schema, loading },
          updateSelection,
          selection,
        }) => {
          let cache = filterWithKeys(
            key => key.indexOf("$ROOT_QUERY.__schema") === -1,
            client.cache.extract()
          );
          if (cache.ROOT_QUERY) {
            delete cache.ROOT_QUERY.__schema;
          }
          let nodes;
          let links;
          const isDefinedType = x => x.kind === "OBJECT" && x.name[0] !== "_";
          if (__schema) {
            const types = __schema.types.filter(isDefinedType);

            const colors = chroma
              .scale(["#42517d", "#584063"])
              .mode("lch")
              .colors(types.length);

            nodes = types.map(({ name }, i) => ({
              id: name,
              label: name,
              color: colors[i],
              entries: Object.keys(cache).filter(
                x => cache[x].__typename === name
              ),
            }));

            links = [].concat.apply(
              [],
              types
                .map(type => ({
                  source: type.name,
                  targets: type.fields
                    .filter(
                      x =>
                        isDefinedType(x.type) ||
                        (x.type.kind === "LIST" && isDefinedType(x.type.ofType))
                    )
                    .map(
                      field =>
                        isDefinedType(field.type)
                          ? field.type.name
                          : field.type.ofType.name
                    ),
                }))
                .map(({ source, targets }) =>
                  targets.map(target => ({
                    source,
                    target,
                  }))
                )
            );
          }

          const scale = scaleLinear()
            .domain([0, Object.keys(cache).length])
            .range([15, 50]);

          console.log({ selection });

          const selected = selection
            ? filterWithKeys(
                (_, { __typename }) => __typename === selection.id,
                client.cache.extract()
              )
            : {};

          return (
            <div>
              {__schema && (
                <div>
                  <h3>Graph of Schema: </h3>
                  <div
                    style={{
                      width: "100%",
                      alignItems: "center",
                      display: "flex",
                      flexDirection: "row",
                      border: "2px solid #ccc",
                    }}
                  >
                    <div
                      style={{
                        flex: "2 0 0",
                      }}
                    >
                      <Size
                        render={({ width, height }) => (
                          <InteractiveForceGraph
                            simulationOptions={{
                              height: 300,
                              width,
                            }}
                            labelAttr="label"
                            onSelectNode={(_, id) => updateSelection(id)}
                            onDeselectNode={() => updateSelection(null)}
                            selectedNode={selection}
                            labelOffset={{
                              x: ({ radius = 5 }) => radius - radius / 5,
                              y: ({ radius = 5 }) => -radius + radius / 5,
                            }}
                            showLabels
                            zoom
                            highlightDependencies
                          >
                            {nodes &&
                              nodes.map(node => (
                                <ForceGraphNode
                                  node={{
                                    ...node,
                                    radius: scale(node.entries.length),
                                  }}
                                  key={node.id}
                                  fill={node.color}
                                />
                              ))}
                            {links &&
                              links.map(link => (
                                <ForceGraphLink
                                  link={{ ...link, value: 2 }}
                                  key={`${link.source}:${link.target}`}
                                />
                              ))}
                          </InteractiveForceGraph>
                        )}
                      />
                    </div>
                    <div
                      style={{
                        flex: "1 0 0",
                        height: "100%",
                      }}
                    >
                      {selection && (
                        <div>
                          <h3>{selection.id}:</h3>
                          <code>
                            <pre>{JSON.stringify(selected, null, 2)}</pre>
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        }
      )
    )
  )
);

export const App = () => (
  <div>
    <Route exact path="/" component={Posts} />
  </div>
);
