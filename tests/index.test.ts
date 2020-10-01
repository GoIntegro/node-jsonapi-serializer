import { JSONAPIDeserializer, JSONApiSerializer } from "../src";

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
  const output = await JSONAPIDeserializer.deserialize(jsonapiResponse);
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
  const output = await JSONAPIDeserializer.deserialize(jsonapiResponse);
  expect(output).toHaveProperty("data");
  const { data } = output;
  expect(data.photos).toEqual(["1", "2"]);
  expect(data.role).toEqual("1");
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
  const output = await JSONAPIDeserializer.deserialize(jsonapiResponse);
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
  const output = await JSONAPIDeserializer.deserialize(jsonapiResponse);
  const { data } = output;
  expect(data.films[0].characters[0].films[0].characters[0]).toEqual(data);
  expect(data.starships[0].pilots[1].films[0].characters[0]).toEqual(data);
});

class StarchipSerializer extends JSONApiSerializer {
  public serializerConfig = () => {
    return {
      type: "starships",
      attributes: ["name", "model"],
      relationships: {
        pilots: () => new PeopleSerializer().serializerConfig(),
      },
    };
  };
}

class FilmSerializer extends JSONApiSerializer {
  public serializerConfig = () => {
    return {
      type: "films",
      attributes: ["title", "director", "producer"],
      relationships: {
        characters: () => {
          console.log(
            "execute characters serializerConfig",
            new PeopleSerializer().serializerConfig()
          );
          return new PeopleSerializer().serializerConfig();
        },
      },
    };
  };
}

class PeopleSerializer extends JSONApiSerializer {
  public serializerConfig = () => {
    return {
      type: "people",
      attributes: ["name", "height", "mass"],
      relationships: {
        films: () => new FilmSerializer().serializerConfig(),
        starships: () => new StarchipSerializer().serializerConfig(),
      },
    };
  };
}

test("JSONAPISerializer: basic attributes", async () => {
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
  const output = filmSerializer.serialize(
    filmData,
    {},
    "es",
    "characters.starships.pilots.films.characters.pilots.films"
  );
  console.log(output);
});
