export type JSONApiIdentity = {
  id: string;
  type: string;
};

export type JSONApiSingleRelationshipValues =
  | JSONApiIdentity
  | JSONApiResource
  | null;
export type JSONApiMultipleRelationshipValues =
  | JSONApiIdentity[]
  | JSONApiResource[]
  | [];

export type JSONApiRelationshipValues =
  | JSONApiSingleRelationshipValues
  | JSONApiMultipleRelationshipValues;

export type JSONApiRelationships = {
  [key: string]: {
    data: JSONApiRelationshipValues;
  };
};

export type JSONApiResource = JSONApiIdentity & {
  attributes?: {
    [key: string]: string | number | boolean | null;
  };
  relationships?: JSONApiRelationships;
};

export type JSONApiData = JSONApiResource | JSONApiResource[] | null | [];

export type JSONApiIncluded = JSONApiResource[];

export type JSONApiResponse = {
  data: JSONApiData;
  included?: JSONApiIncluded;
  meta?: any;
};

export type RelationshipsConfig = {
  [key: string]: {
    config: (data?: any) => SerializerConfig;
    options?: { allowInclude: boolean };
  };
};

export type SerializerConfig = {
  type: string;
  attributes: string[];
  i18nAttributes?: any;
  i18nDefaultKey?: string;
  relationships?: RelationshipsConfig;
  meta?: (meta: any) => any;
};

export type SerializeRequest = {
  data: any;
  meta?: any;
  lang?: string;
  includeWhitelistKeys?: string;
  compound?: boolean;
};
