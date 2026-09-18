import assert from "node:assert/strict";
import test from "node:test";
import { generateLocalLyrics } from "./LocalLyricEngine.js";

test("generates materially different lyrics for different prompts", () => {
  const liberty=generateLocalLyrics({prompt:"A patriotic country rap about personal liberty and standing against a socialist agenda",genre:"country rap"});
  const family=generateLocalLyrics({prompt:"A gentle acoustic song about a grandmother welcoming everyone home",genre:"country"});
  assert.notEqual(liberty.lyrics,family.lyrics);
  assert.match(liberty.lyrics,/liberty|conscience|socialist/i);
  assert.match(family.lyrics,/home|family|door/i);
  assert.doesNotMatch(liberty.lyrics,/A new day opens like a road without a name/);
});

test("removes artist-imitation wording from the extracted theme", () => {
  const result=generateLocalLyrics({prompt:"Write a country rap about civic freedom in the style of A Famous Artist",genre:"country rap"});
  assert.doesNotMatch(result.theme,/Famous Artist/i);
  assert.doesNotMatch(result.lyrics,/Famous Artist/i);
});

test("varies lyrics within the same topic family", () => {
  const first=generateLocalLyrics({prompt:"A song about rebuilding after a difficult setback"});
  const second=generateLocalLyrics({prompt:"A song about surviving a storm and starting again"});
  assert.notEqual(first.lyrics,second.lyrics);
});
