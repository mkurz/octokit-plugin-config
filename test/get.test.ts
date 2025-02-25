import { Octokit } from "@octokit/core";
import fetchMock from "fetch-mock";
import stripIndent from "strip-indent";

import { config } from "../src";
import { Configuration } from "../src/types";

const TestOctokit = Octokit.plugin(config);

const NOT_FOUND_RESPONSE = {
  status: 404,
  body: {
    message: "Not Found",
    documentation_url:
      "https://docs.github.com/rest/reference/repos#get-repository-content",
  },
};

const deepMergeSettings = (
  defaults: Configuration,
  configs: Configuration[]
) => {
  const allConfigs = [defaults, ...configs];
  const fileSettingsConfigs = allConfigs.map(
    (config: Configuration) => config.settings
  );
  return Object.assign({}, ...allConfigs, {
    settings: Object.assign({}, ...fileSettingsConfigs),
  });
};

describe("octokit.config.get", () => {
  it("README simple usage example", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        `comment: 'Thank you for creating the issue!'`,
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("config file missing", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      )
      .getOnce(
        "https://api.github.com/repos/octocat/.github/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      defaults: {
        comment: "Thank you for creating the issue!",
      },
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("returns defaults option when no config files exist", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      )
      .getOnce(
        "https://api.github.com/repos/octocat/.github/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      defaults: {
        comment: "Thank you for creating the issue!",
      },
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("merges defaults option", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        `config: 'value from .github/my-app.yml'`
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      defaults: {
        config: "default value",
        otherConfig: "default value",
      },
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("merges defaults option from .github repository", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      )
      .getOnce(
        "https://api.github.com/repos/octocat/.github/contents/.github%2Fmy-app.yml",
        `config: 'value from octocat/.github:.github/my-app.yml'`
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      defaults: {
        config: "default value",
        otherConfig: "default value",
      },
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("merges deeply using defaults function", async () => {
    const mock = fetchMock.sandbox().getOnce(
      "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
      stripIndent(`
          settings:
            one: value from config file
          otherSetting1: value from config file`)
    );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const defaults = {
      settings: {
        one: "default value",
        two: "default value",
      },
      otherSetting1: "default value",
      otherSetting2: "default value",
    };
    const result = await octokit.config.get<typeof defaults>({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      defaults: (configs) => deepMergeSettings(defaults, configs),
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("branch option", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml?ref=my-branch",
        `comment: 'Thank you for creating the issue!'`,
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      branch: "my-branch",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends: base", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from repo config file
        _extends: base`)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from base config file
        setting2: value from base config file`)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends: base -> _extends: base2", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from repo config file
        _extends: base`)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from base1 config file
        setting2: value from base1 config file
        _extends: base2`)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base2/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from base2 config file
        setting2: value from base2 config file
        setting3: value from base2 config file`)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends: base with defaults and custom merge", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        settings:
          one: value from repo config file
        otherSetting1: value from repo config file
        _extends: base`)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base/contents/.github%2Fmy-app.yml",
        stripIndent(`
        settings:
          one: value from base config file
          two: value from base config file
        otherSetting1: value from base config file
        otherSetting2: value from base config file`)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const defaults = {
      settings: {
        one: "default value",
        two: "default value",
        three: "default value",
      },
      otherSetting1: "default value",
      otherSetting2: "default value",
      otherSetting3: "default value",
    };
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
      defaults: (configs) => deepMergeSettings(defaults, configs),
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("config file is a submodule", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        {
          body: {},
          headers: {
            "content-type": "application/json; charset=utf-8",
          },
        }
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml exists, but is either a directory or a submodule. Ignoring."`
      );
    }

    expect(mock.done()).toBe(true);
  });

  it("config file is empty", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        ""
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("repo is .github", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/.github/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: ".github",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends file is missing", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
      setting1: value from repo config file
      _extends: base`)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base/contents/.github%2Fmy-app.yml",
        NOT_FOUND_RESPONSE
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("request error", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        {
          status: 500,
        }
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yml",
      });
    } catch (error: any) {
      expect(error.status).toEqual(500);
    }

    expect(mock.done()).toBe(true);
  });

  it("recursion", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        settings:
          one: value from repo config file
        otherSetting1: value from repo config file
        _extends: base`)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base/contents/.github%2Fmy-app.yml",
        stripIndent(`
        settings:
          one: value from base config file
          two: value from base config file
        otherSetting1: value from base config file
        otherSetting2: value from base config file
        _extends: hello-world`)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Recursion detected. Ignoring  \\"_extends: undefined\\" from https://api.github.com/repos/octocat/base/contents/.github%2Fmy-app.yml because https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml was already loaded."`
      );
    }

    expect(mock.done()).toBe(true);
  });

  it(".yaml extension", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml",
        `comment: 'Thank you for creating the issue!'`,
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yaml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it(".json extension", async () => {
    const mock = fetchMock.sandbox().getOnce(
      "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.json",
      { comment: "Thank you for creating the issue!" },
      {
        headers: {
          accept: "application/vnd.github.v3.raw",
        },
      }
    );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.json",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it(".unknown extension", async () => {
    expect.assertions(1);

    const octokit = new TestOctokit();

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.unknown",
      });
    } catch (error: any) {
      expect(error.message).toEqual(
        '[@probot/octokit-plugin-config] .unknown extension is not support for configuration (path: ".github/my-app.unknown")'
      );
    }
  });

  it("malformed json", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.json",
        "malformed json",
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.json",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Configuration could not be parsed from https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.json (invalid JSON)"`
      );
    }

    expect(mock.done()).toBe(true);
  });

  it("malformed yaml", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml",
        "malformed yaml",
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yaml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Configuration could not be parsed from https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml (YAML is not an object)"`
      );
    }

    expect(mock.done()).toBe(true);
  });

  it("malformed yaml: @", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml",
        "@",
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yaml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Configuration could not be parsed from https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml (invalid YAML)"`
      );
    }

    expect(mock.done()).toBe(true);
  });
  it("unsafe yaml", async () => {
    expect.assertions(2);

    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml",
        'evil: !<tag:yaml.org,2002:js/function> "function () {}"',
        {
          headers: {
            accept: "application/vnd.github.v3.raw",
          },
        }
      );
    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yaml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Configuration could not be parsed from https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yaml (unsafe YAML)"`
      );
    }

    expect(mock.done()).toBe(true);
  });

  it("_extends: other-owner/base", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from repo config file
        _extends: other-owner/base
      `)
      )
      .getOnce(
        "https://api.github.com/repos/other-owner/base/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from base config file
        setting2: value from base config file
      `)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends: base:test.yml", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from repo config file
        _extends: base:test.yml
      `)
      )
      .getOnce(
        "https://api.github.com/repos/octocat/base/contents/test.yml",
        stripIndent(`
        setting1: value from base config file
        setting2: value from base config file
      `)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends: other-owner/base:test.yml", async () => {
    const mock = fetchMock
      .sandbox()
      .getOnce(
        "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
        stripIndent(`
        setting1: value from repo config file
        _extends: other-owner/base:test.yml
      `)
      )
      .getOnce(
        "https://api.github.com/repos/other-owner/base/contents/test.yml",
        stripIndent(`
        setting1: value from base config file
        setting2: value from base config file
      `)
      );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });
    const result = await octokit.config.get({
      owner: "octocat",
      repo: "hello-world",
      path: ".github/my-app.yml",
    });

    expect(result).toMatchSnapshot("result");
    expect(mock.done()).toBe(true);
  });

  it("_extends: invalid!", async () => {
    expect.assertions(2);

    const mock = fetchMock.sandbox().getOnce(
      "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
      stripIndent(`
        setting1: value from repo config file
        _extends: invalid!
      `)
    );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Invalid value \\"invalid!\\" for _extends in https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml"`
      );
    }

    expect(mock.done()).toBe(true);
  });

  it("_extends: { nope }", async () => {
    expect.assertions(2);

    const mock = fetchMock.sandbox().getOnce(
      "https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml",
      stripIndent(`
        setting1: value from repo config file
        _extends: { nope }
      `)
    );

    const octokit = new TestOctokit({
      request: {
        fetch: mock,
      },
    });

    try {
      await octokit.config.get({
        owner: "octocat",
        repo: "hello-world",
        path: ".github/my-app.yml",
      });
    } catch (error: any) {
      expect(error.message).toMatchInlineSnapshot(
        `"[@probot/octokit-plugin-config] Invalid value {\\"nope\\":null} for _extends in https://api.github.com/repos/octocat/hello-world/contents/.github%2Fmy-app.yml"`
      );
    }

    expect(mock.done()).toBe(true);
  });
});
