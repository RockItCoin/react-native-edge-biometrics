import * as React from 'react';

import { StyleSheet, View, Text } from 'react-native';
import { getSupportedBiometryType } from 'react-native-edge-biometrics';

export default function App() {
  const [result, setResult] = React.useState<number | undefined>();

  React.useEffect(() => {
    getSupportedBiometryType().then((res) => console.log(res));
  }, []);

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
