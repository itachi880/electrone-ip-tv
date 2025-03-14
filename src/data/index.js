import { createStore } from "react-data-stores";
/**
 * @type {{
 * name: string,
 * referer: string | null,
 * link: string,
 * quality: {},
 * state: "OK"|"NO"|string}[]}
 */
const channels = [];
export const data = createStore({
  channels: channels,
});
export const loadingbarstore = createStore({ loading: false });
