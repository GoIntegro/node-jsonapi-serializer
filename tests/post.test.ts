import { JSONAPIDeserializer, JSONAPISerializer } from "../src";

test("JSONAPISerializer: compound nested", async () => {
  class PostSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "posts",
        attributes: ["content"],
        relationships: {
          poll: { config: new PollSerializer().serializerConfig },
        },
      };
    };
  }
  class PollSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "polls",
        attributes: ["ttl"],
        relationships: {
          options: { config: new PollOptionSerializer().serializerConfig },
        },
      };
    };
  }

  class PollOptionSerializer extends JSONAPISerializer {
    public serializerConfig = () => {
      return {
        type: "poll-options",
        attributes: ["title"],
      };
    };
  }

  const postData = {
    content: "Test",
    poll: {
      ttl: "3",
      options: [
        {
          title: "Test 1",
        },
        {
          title: "Test 2",
        },
      ],
    },
  };

  const postSerializer = new PostSerializer();
  const output = postSerializer.serialize({
    data: postData,
    compound: true,
  });

  expect(
    output.data.relationships.poll.data.relationships.options.data[0].attributes
      .title
  ).toEqual("Test 1");
});
