import { describe, expect, it } from "vitest";
import { parseCommand } from "./commands";

describe("parseCommand", () => {
  it.each([
    ["left", "left"],
    ["lef", "left"],
    ["ri", "right"],
    ["do", "down"],
    ["dr", "drop"],
    ["cl", "clockwise"],
    ["co", "counterclockwise"],
    ["levelu", "levelup"],
    ["leveld", "leveldown"],
    ["ho", "hold"],
    ["hi", "hint"],
    ["p", "play"],
    ["re", "restart"],
    ["DROP", "drop"],
  ])("reads %s as %s", (input, name) => {
    expect(parseCommand(input)).toEqual({ name, times: 1 });
  });

  it("reads a leading number as a multiplier", () => {
    expect(parseCommand("3ri")).toEqual({ name: "right", times: 3 });
    expect(parseCommand(" 12 drop ")).toEqual({ name: "drop", times: 12 });
    expect(parseCommand("0left")).toEqual({ name: "left", times: 0 });
  });

  it("matches block letters exactly", () => {
    expect(parseCommand("T")).toEqual({ name: "T", times: 1 });
    expect(parseCommand("I").name).toBe("I");
  });

  it("explains ambiguous prefixes", () => {
    expect(parseCommand("le").error).toBe('"le" could be left, levelup, leveldown.');
    expect(parseCommand("d").error).toMatch(/down, drop/);
    expect(parseCommand("c").error).toMatch(/clockwise, counterclockwise/);
  });

  it("rejects unknown commands and junk", () => {
    expect(parseCommand("jump").error).toBe('Unknown command "jump".');
    expect(parseCommand("").error).toBeDefined();
    expect(parseCommand("left2").error).toBeDefined();
  });
});
