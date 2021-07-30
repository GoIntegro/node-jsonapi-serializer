import { JSONAPIDeserializer, JSONAPISerializer } from "../src";

test("JSONAPIDeserializer:compound relationships w/o ids", async () => {
  var jsonapiResponse = {
    data: {
      type: "email-lists",
      relationships: {
        emails: {
          data: [
            {
              type: "emails",
              attributes: {
                email: "email-1@mail.com",
              },
            },
            {
              type: "emails",
              attributes: {
                email: "email-2@mail.com",
              },
            },
          ],
        },
      },
    },
  };

  // @ts-ignore @todo check this type
  const output = JSONAPIDeserializer.deserialize(jsonapiResponse);
  expect(output.data.emails[0].email).toEqual("email-1@mail.com");
  expect(output.data.emails[1].email).toEqual("email-2@mail.com");
});

test("JSONAPIDeserializer:basic attributes", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "users",
      attributes: {
        "first-name": "John",
        "last-name": "Doe",
      },
    },
  };
  const output = JSONAPIDeserializer.deserialize(jsonapiResponse);
  expect(output).toHaveProperty("data");
  const { data } = output;
  expect(data).toHaveProperty("type");
  expect(data).toHaveProperty("firstName");
  expect(data).toHaveProperty("lastName");
});

test("JSONAPIDeserializer:basic relationships", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "users",
      attributes: {
        "first-name": "John",
        "last-name": "Doe",
      },
      relationships: {
        role: {
          data: {
            id: "1",
            type: "roles",
          },
        },
        photos: {
          data: [
            { id: "1", type: "files" },
            { id: "2", type: "files" },
          ],
        },
      },
    },
  };
  const output = JSONAPIDeserializer.deserialize(jsonapiResponse, {
    keepRelationshipsTypes: false,
  });
  expect(output).toHaveProperty("data");
  const { data } = output;
  expect(data.photos).toEqual(["1", "2"]);
  expect(data.role).toEqual("1");
});

test("JSONAPIDeserializer:basic relationships with types", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "users",
      attributes: {
        "first-name": "John",
        "last-name": "Doe",
      },
      relationships: {
        role: {
          data: {
            id: "1",
            type: "roles",
          },
        },
        photos: {
          data: [
            { id: "1", type: "files" },
            { id: "2", type: "files" },
          ],
        },
      },
    },
  };
  const output = JSONAPIDeserializer.deserialize(jsonapiResponse, {
    keepRelationshipsTypes: true,
  });
  const { data } = output;
  expect(data.photos[0]).toEqual({ id: "1", type: "files" });
  expect(data.photos[1]).toEqual({ id: "2", type: "files" });
});

test("JSONAPIDeserializer:included relationships", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "users",
      attributes: {
        "first-name": "John",
        "last-name": "Doe",
      },
      relationships: {
        role: {
          data: {
            id: "1",
            type: "roles",
          },
        },
        photos: {
          data: [
            { id: "1", type: "files" },
            { id: "2", type: "files" },
          ],
        },
      },
    },
    included: [
      {
        id: "1",
        type: "roles",
        attributes: {
          title: "basic",
        },
      },
      {
        id: "1",
        type: "files",
        attributes: {
          url: "file1.jpg",
        },
      },
      {
        id: "2",
        type: "files",
        attributes: {
          url: "file2.jpg",
        },
      },
    ],
  };
  const output = JSONAPIDeserializer.deserialize(jsonapiResponse);
  expect(output).toHaveProperty("data");
  const { data } = output;
  expect(data.role).toEqual({ id: "1", type: "roles", title: "basic" });
  expect(data.photos).toEqual([
    { id: "1", type: "files", url: "file1.jpg" },
    { id: "2", type: "files", url: "file2.jpg" },
  ]);
});

test("JSONAPIDeserializer:nested included circular relationships", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "people",
      attributes: {
        name: "Luke Skywalker",
        height: "172",
        mass: "77",
      },
      relationships: {
        films: {
          data: [
            {
              id: "1",
              type: "films",
            },
            {
              id: "2",
              type: "films",
            },
          ],
        },
        starships: {
          data: [
            {
              id: "12",
              type: "starships",
            },
            {
              id: "22",
              type: "starships",
            },
          ],
        },
      },
    },
    included: [
      {
        id: "12",
        type: "starships",
        attributes: {
          name: "X-wing",
          model: "T-65 X-wing",
        },
        relationships: {
          pilots: {
            data: [
              {
                id: "1",
                type: "people",
              },
              {
                id: "9",
                type: "people",
              },
            ],
          },
        },
      },
      {
        id: "9",
        type: "people",
        attributes: {
          name: "Biggs Darklighter",
          height: "183",
          mass: "84",
        },
        relationships: {
          films: {
            data: [
              {
                id: "1",
                type: "films",
              },
            ],
          },
        },
      },
      {
        id: "2",
        type: "people",
        attributes: {
          name: "C-3PO",
          height: "167",
          mass: "75",
        },
        relationships: {
          films: {
            data: [
              {
                id: "1",
                type: "films",
              },
              {
                id: "2",
                type: "films",
              },
              {
                id: "3",
                type: "films",
              },
            ],
          },
        },
      },
      {
        id: "1",
        type: "people",
        attributes: {
          name: "Luke Skywalker",
          height: "172",
          mass: "77",
        },
        relationships: {
          films: {
            data: [
              {
                id: "1",
                type: "films",
              },
              {
                id: "2",
                type: "films",
              },
            ],
          },
          starships: {
            data: [
              {
                id: "12",
                type: "starships",
              },
              {
                id: "22",
                type: "starships",
              },
            ],
          },
        },
      },

      {
        id: "1",
        type: "films",
        attributes: {
          title: "A New Hope",
          director: "George Lucas",
          producer: "Gary Kurtz, Rick McCallum",
        },
        relationships: {
          characters: {
            data: [
              {
                id: "1",
                type: "people",
              },
              {
                id: "2",
                type: "people",
              },
            ],
          },
        },
      },
      {
        id: "1",
        type: "films",
        attributes: {
          title: "The Empire Strikes Back",
          director: "Irvin Kershner",
          producer: "Gary Kurtz, Rick McCallum",
        },
        relationships: {
          characters: {
            data: [
              {
                id: "1",
                type: "people",
              },
              {
                id: "2",
                type: "people",
              },
            ],
          },
        },
      },
    ],
  };
  const output = JSONAPIDeserializer.deserialize(jsonapiResponse);
  const { data } = output;
  expect(data.films[0].characters[0].films[0].characters[0]).toEqual(data);
  expect(data.starships[0].pilots[1].films[0].characters[0]).toEqual(data);
});

test("JSONAPISerializer: basic attributes", async () => {
  class StarchipSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "starships",
        attributes: ["name", "model"],
        relationships: {
          pilots: { config: new PeopleSerializer().serializerConfig },
        },
      };
    };
  }

  class FilmSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "films",
        attributes: ["title", "director", "producer"],
        relationships: {
          characters: { config: new PeopleSerializer().serializerConfig },
        },
      };
    };
  }
  class PeopleSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "people",
        attributes: ["name", "height", "mass"],
        relationships: {
          films: { config: new FilmSerializer().serializerConfig },
          starships: { config: new StarchipSerializer().serializerConfig },
        },
      };
    };
  }

  const filmData = [
    {
      id: "1",
      title: "A New Hope",
      director: "George Lucas",
      producer: "Gary Kurtz, Rick McCallum",
      characters: [
        {
          id: "1",
          type: "people",
          name: "Luke Skywalker",
          height: "172",
          mass: "77",
          films: [
            {
              id: "2",
              title: "The Empire Strikes Back",
              director: "Irvin Kershner",
              producer: "Gary Kurtz, Rick McCallum",
              characters: ["1", "2"],
            },
          ],
          starships: [
            {
              id: "12",
              name: "X-wing",
              model: "T-65 X-wing",
              pilots: [
                "1",
                {
                  id: "9",
                  name: "Biggs Darklighter",
                  height: "183",
                  mass: "84",
                  films: ["1"],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const filmSerializer = new FilmSerializer();
  const output = filmSerializer.serialize({
    data: filmData,
    includeWhitelistKeys:
      "characters.starships.pilots.films.characters.pilots.films",
  });
});

class FileSerializer extends JSONAPISerializer {
  public serializerConfig = () => {
    return {
      type: "files",
      attributes: ["url"],
    };
  };
}

class ProfileSerializer extends JSONAPISerializer {
  public serializerConfig = () => {
    return {
      type: "profiles",
      attributes: ["gender", "phone"],
      relationships: {
        avatar: { config: new FileSerializer().serializerConfig },
      },
    };
  };
}

class UserSerializer extends JSONAPISerializer {
  public serializerConfig = () => {
    return {
      type: "users",
      attributes: ["name", "last"],
      relationships: {
        profile: { config: new ProfileSerializer().serializerConfig },
      },
    };
  };
}

class BookSerializer extends JSONAPISerializer {
  public serializerConfig = () => {
    return {
      type: "books",
      attributes: ["title", "totalPages"],
      relationships: {
        author: { config: new UserSerializer().serializerConfig },
      },
    };
  };
}

class MovieSerializer extends JSONAPISerializer {
  public serializerConfig = () => {
    return {
      type: "movies",
      attributes: ["name", "duration"],
      relationships: {
        director: { config: new UserSerializer().serializerConfig },
      },
    };
  };
}

class ListItemSerializer extends JSONAPISerializer {
  public serializerConfig = () => {
    return {
      type: "list-items",
      attributes: [],
      relationships: {
        items: {
          config: (item) => {
            const { type } = item;
            switch (type) {
              case "movies":
                return new MovieSerializer().serializerConfig();
              case "books":
                return new BookSerializer().serializerConfig();
            }
          },
        },
      },
    };
  };
}

test("JSONAPISerializer: polymorphic relationships", async () => {
  const inputData = {
    id: "1",
    items: [
      {
        id: "1",
        type: "books",
        title: "title book number 1",
        totalPages: 250,
        author: "1",
      },
      {
        id: "1",
        type: "movies",
        title: "title movie number 1",
        duration: 120,
        director: "1",
      },
    ],
  };

  const listItemSerializer = new ListItemSerializer();
  const output = listItemSerializer.serialize({ data: inputData });
  const { data } = output;

  expect(data.relationships.items.data[0]).toEqual({ id: "1", type: "books" });
  expect(data.relationships.items.data[1]).toEqual({ id: "1", type: "movies" });
});

test("JSONAPIDeserializer: polymorphic megapost", async () => {
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

  // @ts-ignore @todo check this type
  const output = JSONAPIDeserializer.deserialize(inputData);
  const { data } = output;

  expect(data.items[0].author.profile.avatar.url).toEqual("avatar-1.jpg");
});

test("JSONAPISerializer: null relationship with data null", async () => {
  const inputData = {
    id: "1",
    name: "El discurso del rey",
    duration: 120,
    director: null,
  };

  const movieSerializer = new MovieSerializer();
  const output = movieSerializer.serialize({ data: inputData });
  const { data } = output;

  expect(data.relationships.director.data).toBeNull();
});

test("JSONAPISerializer: undefined relationship with data null", async () => {
  const inputData = {
    id: "1",
    name: "El discurso del rey",
    duration: 120,
    director: undefined,
  };

  const movieSerializer = new MovieSerializer();
  const output = movieSerializer.serialize({ data: inputData });
  const { data } = output;

  expect(data.relationships.director.data).toBeNull();
});

test("JSONAPISerializer: not allow include relationship", async () => {
  class ProfileSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        canBeIncluded: false,
        type: "profiles",
        attributes: ["gender", "phone"],
        relationships: {
          avatar: { config: new FileSerializer().serializerConfig },
        },
      };
    };
  }

  class UserSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "users",
        attributes: ["name", "last"],
        relationships: {
          profile: {
            config: new ProfileSerializer().serializerConfig,
            options: { allowInclude: true },
          },
        },
      };
    };
  }
  const userSerializer = new UserSerializer();
  const inputData = {
    id: "1",
    name: "Harrison",
    last: "Ford",
    profile: {
      id: "2",
      gender: "male",
      phone: "+54112223333",
      avatar: {
        url: "https://file.com",
      },
    },
  };

  const output = userSerializer.serialize({
    data: inputData,
    includeWhitelistKeys: "profile",
  });
  const { data, included } = output;

  expect(data.relationships.profile.data.id).toBe("2");
  expect(included).toBeUndefined();
});
