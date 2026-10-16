import React from "react";
import { act, render } from "@testing-library/react";
jest.mock("@capacitor/core", () => {
  const native = { appReady: jest.fn(async () => {}) };
  return { Capacitor: { isNativePlatform: () => true }, registerPlugin: () => native, __native: native };
});
import { __native } from "@capacitor/core";
import { useLaunchReady } from "./launchScreen";
function Destination({ ready }) { useLaunchReady(ready); return <div>{ready ? "My Courses" : "Loading"}</div>; }
test("splash handoff waits for a ready destination and two paint frames", async () => {
  const frames = [];
  const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
  const view = render(<Destination ready={false} />);
  expect(__native.appReady).not.toHaveBeenCalled();
  view.rerender(<Destination ready={true} />);
  expect(__native.appReady).not.toHaveBeenCalled();
  await act(async () => frames.shift()());
  expect(__native.appReady).not.toHaveBeenCalled();
  await act(async () => frames.shift()());
  expect(__native.appReady).toHaveBeenCalledTimes(1);
  view.unmount(); raf.mockRestore();
});
