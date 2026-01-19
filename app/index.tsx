import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { getIdToken } from "../lib/auth";

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = await getIdToken();
        if (mounted) setAuthed(!!t);
      } finally {
        if (mounted) setChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!checked || authed === null) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Redirect href={authed ? "/start" : "/login"} />;
}
