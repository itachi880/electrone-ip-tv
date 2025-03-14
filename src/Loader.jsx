import React, { useEffect, useState } from "react";
import { loadingbarstore } from "./data";
import "./loadingbar.css";

export default function LoadingBar() {
  const [loading, setLoading] = useState(false);
  const LoadingBarState = loadingbarstore.useStore({ setter: false });
  useEffect(() => {
    setLoading(LoadingBarState.loading);
  }, [LoadingBarState]);
  if (loading) return <div className="loading-bar"></div>;
  return <></>;
}
