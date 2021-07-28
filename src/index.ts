import {
  assign,
  camelCase,
  drop,
  find,
  forEach,
  forIn,
  get,
  isEmpty,
  isNull,
  isObject,
  isUndefined,
  kebabCase,
  keys,
  map,
  reduce,
  set,
  transform,
  without,
} from "lodash";
import {
  JSONApiData,
  JSONApiIdentity,
  JSONApiIncluded,
  JSONApiRelationshipValues,
  JSONApiResource,
  JSONApiResponse,
  JSONApiSingleRelationshipValues,
  SerializerConfig,
  SerializeRequest,
  RelationshipOptions,
} from "./types";

export const JSONAPIDeserializer = {
  isCompoundValue(value: any): boolean {
    return isObject(value) && !isEmpty(without(keys(value), "id", "type"));
  },

  setResolvedItem<T>(
    resource: JSONApiResource,
    data: any,
    resolvedMap: unknown
  ): T {
    const key = `${resource.id}-${resource.type}`;

    set(resolvedMap as any, key, data);
    return resolvedMap as T;
  },

  hasNotRelationshipData(data: JSONApiRelationshipValues): boolean {
    return (
      (this.isHasMany(data) && isEmpty(data)) ||
      (!this.isHasMany(data) && data === null)
    );
  },

  isHasMany(data: JSONApiData): boolean {
    return Array.isArray(data);
  },

  getDataFromIncluded(
    id: string,
    type: string,
    includedData: JSONApiIncluded
  ): JSONApiResource | undefined {
    return find(includedData, (data) => {
      return data.type === type && data.id === id;
    });
  },

  getResolvedItem<T, K extends keyof T>(
    resource: JSONApiResource,
    resolvedMap: T
  ): T[K] {
    if (!resource.id || !resource.type) {
      return;
    }
    const key = `${resource.id}-${resource.type}`;

    return get(resolvedMap, key);
  },

  _deserialize(
    data: JSONApiResource,
    includedData: JSONApiIncluded,
    resolvedMap: any
  ): { [s: string]: any } {
    const output: any = {};
    const id = data.id || null;
    const type = data.type;

    const resolvedItem = this.getResolvedItem(data, resolvedMap);
    if (resolvedItem) {
      return resolvedItem;
    }

    this.setResolvedItem(data, output, resolvedMap);

    const attributes = transform(
      data.attributes,
      (acum, value, key: string) => {
        acum[camelCase(key)] = value;
        return acum;
      },
      {}
    );

    const relationships = reduce(
      data.relationships,
      (acum, value, key) => {
        const isHasMany = this.isHasMany(value.data);
        const relationshipData = value.data;
        const hasNotRelationshipData = this.hasNotRelationshipData(
          relationshipData
        );

        if (hasNotRelationshipData) {
          acum[camelCase(key)] = relationshipData;
          return acum;
        }

        if (isHasMany) {
          acum[camelCase(key)] = (value.data as (
            | JSONApiIdentity
            | JSONApiResource
          )[]).map((relationshipItemData) => {
            const isCompoundValue = this.isCompoundValue(relationshipItemData);
            const itemId = relationshipItemData.id;
            const itemType = relationshipItemData.type;

            if (isCompoundValue) {
              return this._deserialize(
                relationshipItemData,
                includedData,
                resolvedMap
              );
            }

            const matchedIncluded = this.getDataFromIncluded(
              itemId,
              itemType,
              includedData
            );
            return matchedIncluded
              ? this._deserialize(matchedIncluded, includedData, resolvedMap)
              : itemId;
          });
        } else {
          const isCompoundValue = this.isCompoundValue(relationshipData);
          const itemId = (relationshipData as JSONApiSingleRelationshipValues)
            .id;
          const itemType = (relationshipData as JSONApiSingleRelationshipValues)
            .type;
          const matchedIncluded = this.getDataFromIncluded(
            itemId,
            itemType,
            includedData
          );

          if (isCompoundValue) {
            acum[camelCase(key)] = this._deserialize(
              relationshipData as JSONApiSingleRelationshipValues,
              includedData,
              resolvedMap
            );
          } else {
            acum[camelCase(key)] = matchedIncluded
              ? this._deserialize(matchedIncluded, includedData, resolvedMap)
              : itemId;
          }
        }
        return acum;
      },
      {}
    );

    assign(output, attributes, relationships);

    if (id) {
      output.id = id;
    }

    output.type = type;

    return output;
  },

  deserialize({ data, included = [], meta }: JSONApiResponse) {
    const isMultiple = data instanceof Array;
    const resolvedMap = {};

    const output = isMultiple
      ? (data as JSONApiResource[]).map((item) => {
          return this._deserialize(item, included, resolvedMap);
        })
      : this._deserialize(data as JSONApiResource, included, resolvedMap);

    if (meta) {
      return { data: output, meta };
    }

    return { data: output };
  },
};

export class JSONAPISerializer {
  public serializerConfig: (data?: any) => SerializerConfig;

  private isCompoundValue(value: any): boolean {
    return isObject(value) && !isEmpty(without(keys(value), "id", "type"));
  }

  private addToIncluded(
    includedEntities: JSONApiResource[],
    entity: JSONApiResource
  ): number {
    return includedEntities.push(entity);
  }

  private addToSerializedEntities(
    serializedEntities: JSONApiResource[],
    entity: JSONApiResource
  ): number {
    return serializedEntities.push(entity);
  }

  private getSerializedEntity(
    serializedEntities: JSONApiResource[],
    entityId: string,
    entityType: string
  ): JSONApiResource | undefined {
    return find(serializedEntities, (serializedEntity) => {
      return (
        serializedEntity.id === entityId.toString() &&
        serializedEntity.type === entityType
      );
    });
  }

  private isEntityIncluded(
    includedEntities: JSONApiResource[],
    entityId: string,
    entityType: string
  ): boolean {
    return Boolean(
      find(includedEntities, (included) => {
        return (
          included.id === entityId.toString() && included.type === entityType
        );
      })
    );
  }

  private isEntitySerialized(
    serializedEntities: JSONApiResource[],
    entityId: string,
    entityType: string
  ): boolean {
    return Boolean(
      this.getSerializedEntity(serializedEntities, entityId, entityType)
    );
  }

  private removeWhitelistKey(
    key: string,
    includeWhitelistKeys: string[]
  ): string[] {
    const output = reduce(
      includeWhitelistKeys,
      (acum, whitelistedKey) => {
        if (whitelistedKey === key) {
          return acum;
        }
        const splitedWhitelistKey = whitelistedKey.split(".");
        if (splitedWhitelistKey[0] === key) {
          acum.push(drop(splitedWhitelistKey).join("."));
          return acum;
        }

        acum.push(whitelistedKey);
        return acum;
      },
      []
    );

    return output;
  }

  private isKeyWhitelistedIncluded(
    key: string,
    includeWhitelistKeys: string[]
  ): boolean {
    return Boolean(
      includeWhitelistKeys.find((whitelistedKey) => {
        return whitelistedKey?.split(".")?.[0] === key;
      })
    );
  }

  private shouldIncludeRelationship(
    config: SerializerConfig,
    relationshipOptions?: RelationshipOptions
  ) {
    const canBeIncluded = config?.canBeIncluded == false ? false : true;
    const allowInclude =
      relationshipOptions?.allowInclude == false ? false : true;

    return canBeIncluded && allowInclude;
  }

  private serializeEntity(
    data: any,
    config: SerializerConfig,
    includedEntities: JSONApiResource[],
    serializedEntities: JSONApiResource[],
    lang: string,
    includeWhitelistKeys: string[] | null,
    compound: boolean
  ): JSONApiResource {
    const entityId = get(data, "id");
    const entityType = get(data, "type") || config.type;

    if (entityId) {
      if (this.isEntitySerialized(serializedEntities, entityId, entityType)) {
        return this.getSerializedEntity(
          serializedEntities,
          entityId,
          entityType
        );
      }
    }

    const { i18nAttributes = {}, i18nDefaultKey } = config;
    const attributes = reduce(
      config.attributes,
      (acum, name) => {
        const i18nMapedProp = i18nAttributes[name];
        let value = i18nMapedProp
          ? data?.[i18nMapedProp]?.[lang] ||
            data?.[i18nMapedProp]?.[i18nDefaultKey]
          : data[name];

        value = !isUndefined(value) ? value : null;

        acum[kebabCase(name)] = value;
        return acum;
      },
      {}
    );

    const relationships = this.serializeRelationships(data, config);

    const output: any = {
      type: get(data, "type") || config.type,
    };

    if (entityId) {
      output.id = entityId.toString();
    }

    if (!isEmpty(attributes)) {
      output.attributes = attributes;
    }

    if (!isEmpty(relationships)) {
      output.relationships = reduce(
        relationships,
        (acum, value, key) => {
          acum[key] = { data: value };
          return acum;
        },
        {}
      );
    }

    this.addToSerializedEntities(serializedEntities, output);
    // check compound relationships and process to includes
    forIn(relationships, (value, dashCaseKey) => {
      const key = camelCase(dashCaseKey);

      if (!includeWhitelistKeys) {
        return;
      }

      if (includeWhitelistKeys) {
        const isKeyWhitelisted = this.isKeyWhitelistedIncluded(
          key,
          includeWhitelistKeys
        );
        if (!isKeyWhitelisted) {
          return;
        }
      }

      const newIncludeWhitelistKeys = includeWhitelistKeys
        ? this.removeWhitelistKey(key, includeWhitelistKeys)
        : includeWhitelistKeys;

      const originalValue = data[key];
      if (Array.isArray(originalValue)) {
        forEach(originalValue, (v, i) => {
          const {
            config: rc,
            options: relationshipOptions,
          } = config.relationships[key];
          const relationshipConfig = rc(v);
          const isCompoundValue = this.isCompoundValue(v);
          const entityId = get(v, "id") || v;
          const entityType = get(v, "type") || relationshipConfig.type;
          const shouldInclude = this.shouldIncludeRelationship(
            relationshipConfig,
            relationshipOptions
          );

          if (
            shouldInclude &&
            isCompoundValue &&
            !this.isEntityIncluded(includedEntities, entityId, entityType)
          ) {
            const serializedEntity = this.serializeEntity(
              v,
              relationshipConfig,
              includedEntities,
              serializedEntities,
              lang,
              newIncludeWhitelistKeys,
              compound
            );

            if (compound) {
              output.relationships[dashCaseKey].data[i] = serializedEntity;
            } else if (shouldInclude) {
              this.addToIncluded(includedEntities, serializedEntity);
            }
          }
        });
      } else {
        const {
          config: rc,
          options: relationshipOptions,
        } = config.relationships[key];
        const relationshipConfig = rc(originalValue);

        const isCompoundValue = this.isCompoundValue(originalValue);
        const entityId = get(originalValue, "id") || originalValue;
        const entityType =
          get(originalValue, "type") || relationshipConfig.type;

        const shouldInclude = this.shouldIncludeRelationship(
          relationshipConfig,
          relationshipOptions
        );

        if (
          shouldInclude &&
          isCompoundValue &&
          !this.isEntityIncluded(includedEntities, entityId, entityType)
        ) {
          const serializedEntity = this.serializeEntity(
            originalValue,
            relationshipConfig,
            includedEntities,
            serializedEntities,
            lang,
            newIncludeWhitelistKeys,
            compound
          );

          if (compound) {
            output.relationships[dashCaseKey].data = serializedEntity;
          } else if (shouldInclude) {
            this.addToIncluded(includedEntities, serializedEntity);
          }
        }
      }
    });

    if (config.meta) {
      output.meta = config.meta(data);
    }

    return output;
  }

  private serializeRelationships(data: any, config: SerializerConfig) {
    const serializedRelationships = {};

    for (const property in data) {
      // * use for in loop to include enumerables descriptors
      if (get(config, "relationships", {})[property]) {
        const value = data[property];
        if (Array.isArray(value)) {
          serializedRelationships[kebabCase(property)] = map(value, (v, k) => {
            const { config: rc } = config.relationships[property];
            const relationshipConfig = rc(v);
            const entityType = get(v, "type") || relationshipConfig.type;

            const output: any = {
              type: entityType,
            };

            if (v?.id) {
              output.id = v.id.toString();
            }
            return output;
          });
        } else {
          const { config: rc } = config.relationships[property];
          const relationshipConfig = rc(value);

          const entityType = get(value, "type") || relationshipConfig.type;
          const output: any = {
            type: entityType,
          };

          if (value?.id) {
            output.id = value.id.toString();
          }
          serializedRelationships[kebabCase(property)] =
            isNull(value) || isUndefined(value) ? null : output;
        }
      }
    }
    return serializedRelationships;
  }

  private _serialize({ data, meta, lang, includeWhitelistKeys, compound }) {
    const config = this.serializerConfig;
    const output: any = {};
    let entities;
    const includedEntities = [];
    const serializedEntities = [];

    includeWhitelistKeys = includeWhitelistKeys?.split(",") || null;

    if (Array.isArray(data)) {
      entities = data.map((entity) => {
        return this.serializeEntity(
          entity,
          config(entity),
          includedEntities,
          serializedEntities,
          lang,
          includeWhitelistKeys,
          compound
        );
      });
    } else {
      entities = this.serializeEntity(
        data,
        config(data),
        includedEntities,
        serializedEntities,
        lang,
        includeWhitelistKeys,
        compound
      );
    }

    output.data = entities;

    if (!isEmpty(includedEntities)) {
      output.included = includedEntities;
    }

    if (meta) {
      output.meta = meta;
    }

    return output;
  }

  public serialize(request: SerializeRequest) {
    const {
      data,
      meta,
      lang,
      includeWhitelistKeys,
      compound = false,
    } = request;
    return this._serialize({
      data,
      meta,
      lang,
      includeWhitelistKeys,
      compound,
    });
  }
}
