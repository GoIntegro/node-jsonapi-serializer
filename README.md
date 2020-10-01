# node-jsonapi-serializer

## Description

JSONApi lib for GOintegro use cases (support N included level, compound documents (aka "megapost"))

## Usage

### Deserializer

#### Polymorphic megapost

```
import { JSONAPIDeserializer } from "node-jsonapi-serializer;

const inputData = {
  data: {
    id: "1",
    type: "list-items",
    relationships: {
      items: {
        data: [
          {
            type: "books",
            attributes: {
              title: "title book number 1",
              "total-pages": 250,
            },
            relationships: {
              author: {
                data: {
                  type: "users",
                  attributes: {
                    name: "John",
                    last: "Doe",
                  },
                  relationships: {
                    profile: {
                      data: {
                        type: "profiles",
                        attributes: {
                          gender: "male",
                          phone: 1234,
                        },
                        relationships: {
                          avatar: {
                            data: {
                              type: "files",
                              attributes: {
                                url: "avatar-1.jpg",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            id: "1",
            type: "movies",
            attributes: {
              title: "title movie number 1",
              duration: 120,
            },
            relationships: {
              director: {
                data: {
                  id: "2",
                  type: "users",
                  attributes: {
                    name: "Jhon2",
                    last: "Doe2",
                  },
                  relationships: {
                    profile: {
                      data: {
                        type: "profiles",
                        attributes: {
                          gender: "female",
                          phone: 5678,
                        },
                        relationships: {
                          avatar: {
                            data: {
                              type: "files",
                              attributes: {
                                url: "avatar-2.jpg",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
};

const output = await JSONAPIDeserializer.deserialize(inputData);

console.log(output)
/*
{
  items: [
    {
      title: "title book number 1",
      totalPages: 250,
      author: {
        name: "John",
        last: "Doe",
        profile: {
          gender: "male",
          phone: 1234,
          avatar: { url: "avatar-1.jpg", type: "files" },
          type: "profiles",
        },
        type: "users",
      },
      type: "books",
    },
    {
      title: "title movie number 1",
      duration: 120,
      director: {
        name: "Jhon2",
        last: "Doe2",
        profile: {
          gender: "male",
          phone: 1234,
          avatar: { url: "avatar-1.jpg", type: "files" },
          type: "profiles",
        },
        id: "2",
        type: "users",
      },
      id: "1",
      type: "movies",
    },
  ],
  id: "1",
  type: "list-items",
};
*/
```
