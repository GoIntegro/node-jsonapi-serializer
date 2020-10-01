import { JSONAPIDeserializer } from "./";

test("basic", async () => {
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
  expect(output).toEqual({
    data: { id: "1", type: "users", firstName: "fruta" },
  });
});
