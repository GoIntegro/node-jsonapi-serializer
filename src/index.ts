import {
  isEmpty,
  find,
  set,
  get,
  transform,
  camelCase,
  reduce,
  assign,
  isObject,
  without,
  keys,
  drop,
  kebabCase,
  isUndefined,
  forIn,
  forEach,
  map,
  isNull,
} from "lodash";

import {
  JSONApiIdentity,
  JSONApiSingleRelationshipValues,
  JSONApiRelationshipValues,
  JSONApiResource,
  JSONApiData,
  JSONApiIncluded,
  JSONApiResponse,
  SerializerConfig,
  SerializeRequest,
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

  async deserialize({ data, included = [], meta }: JSONApiResponse) {
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

export class JSONApiSerializer {
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

  private serializeEntity(
    data: any,
    config: SerializerConfig,
    includedEntities: JSONApiResource[],
    serializedEntities: JSONApiResource[],
    lang: string,
    includeWhitelistKeys: string[] = []
  ): JSONApiResource {
    const entityId = get(data, "id") || data;
    const entityType = get(data, "type") || config.type;

    if (this.isEntitySerialized(serializedEntities, entityId, entityType)) {
      return this.getSerializedEntity(serializedEntities, entityId, entityType);
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
      id: data.id.toString(),
    };

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
    forIn(relationships, (value, key) => {
      key = camelCase(key);
      const isKeyWhitelisted = this.isKeyWhitelistedIncluded(
        key,
        includeWhitelistKeys
      );
      if (!isKeyWhitelisted) {
        return;
      }

      const newIncludeWhitelistKeys = this.removeWhitelistKey(
        key,
        includeWhitelistKeys
      );

      const originalValue = data[key];
      const relationshipConfig = config.relationships[key](originalValue);
      if (Array.isArray(originalValue)) {
        forEach(originalValue, (v) => {
          const isCompoundValue = this.isCompoundValue(v);
          const entityId = get(v, "id") || v;
          const entityType = get(v, "type") || relationshipConfig.type;

          if (
            isCompoundValue &&
            !this.isEntityIncluded(includedEntities, entityId, entityType)
          ) {
            this.addToIncluded(
              includedEntities,
              this.serializeEntity(
                v,
                relationshipConfig,
                includedEntities,
                serializedEntities,
                lang,
                newIncludeWhitelistKeys
              )
            );
          }
        });
      } else {
        const isCompoundValue = this.isCompoundValue(originalValue);
        const entityId = get(originalValue, "id") || originalValue;
        const entityType =
          get(originalValue, "type") || relationshipConfig.type;

        if (
          isCompoundValue &&
          !this.isEntityIncluded(includedEntities, entityId, entityType)
        ) {
          this.addToIncluded(
            includedEntities,
            this.serializeEntity(
              originalValue,
              relationshipConfig,
              includedEntities,
              serializedEntities,
              lang,
              newIncludeWhitelistKeys
            )
          );
        }
      }
    });

    if (config.meta) {
      output.meta = config.meta(data);
    }

    return output;
  }

  private serializeRelationships(data: any, config: SerializerConfig) {
    return reduce(
      data,
      (acum, value, key) => {
        if (!get(config, "relationships", {})[key]) {
          return acum;
        }

        const relationshipConfig = config.relationships[key](value);

        if (Array.isArray(value)) {
          acum[kebabCase(key)] = map(value, (v, k) => {
            const entityId = get(v, "id") || v;
            const entityType = get(v, "type") || relationshipConfig.type;

            return {
              id: entityId.toString(),
              type: entityType,
            };
          });
        } else {
          const entityId = get(value, "id") || value;
          const entityType = get(value, "type") || relationshipConfig.type;

          acum[kebabCase(key)] = isNull(value)
            ? null
            : {
                id: entityId.toString(),
                type: entityType,
              };
        }

        return acum;
      },
      {}
    );
  }

  private _serialize({ data, config, meta, lang, includeWhitelistKeys }) {
    const output: any = {};
    let entities;
    const includedEntities = [];
    const serializedEntities = [];

    includeWhitelistKeys = includeWhitelistKeys?.split(",") || [];

    if (Array.isArray(data)) {
      entities = data.map((entity) => {
        return this.serializeEntity(
          entity,
          config,
          includedEntities,
          serializedEntities,
          lang,
          includeWhitelistKeys
        );
      });
    } else {
      entities = this.serializeEntity(
        data,
        config,
        includedEntities,
        serializedEntities,
        lang,
        includeWhitelistKeys
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
    const { data, meta, lang, includeWhitelistKeys } = request;
    return this._serialize({
      data,
      config: this.serializerConfig(data),
      meta,
      lang,
      includeWhitelistKeys,
    });
  }
}
