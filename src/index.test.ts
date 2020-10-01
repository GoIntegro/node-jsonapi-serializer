import { JSONAPIDeserializer } from "./";

test("JSONAPIDeserializer:basic attributes", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "users",
      attributes: {
        "first-name": "fruta",
      },
    },
  };
  const output = await JSONAPIDeserializer.deserialize(jsonapiResponse);
  expect(output).toHaveProperty("data");
  const { data } = output;
  expect(data).toHaveProperty("type");
  expect(data).toHaveProperty("firstName");
});

test("JSONAPIDeserializer:basic relationships", async () => {
  const jsonapiResponse = {
    data: {
      id: "1",
      type: "users",
      attributes: {
        "first-name": "fruta",
      },
      relationships: {
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
});
