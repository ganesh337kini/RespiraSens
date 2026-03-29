const KEY_SHARE = "respirasense:shareAggregate";

export function getShareAggregateEnabled() {
  return localStorage.getItem(KEY_SHARE) === "1";
}

export function setShareAggregateEnabled(value) {
  localStorage.setItem(KEY_SHARE, value ? "1" : "0");
}
