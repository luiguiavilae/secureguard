import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  prefix?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric' | 'email-address';
  autoFocus?: boolean;
  maxLength?: number;
  editable?: boolean;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  error,
  prefix,
  keyboardType = 'default',
  autoFocus = false,
  maxLength,
  editable = true,
}: InputProps): React.ReactElement {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View
        style={[
          styles.container,
          focused && styles.focused,
          !!error && styles.errorBorder,
        ]}
      >
        {prefix !== undefined && <Text style={styles.prefix}>{prefix}</Text>}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          maxLength={maxLength}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: '#ffffff',
  },
  focused: {
    borderColor: '#0f3460',
  },
  errorBorder: {
    borderColor: '#dc2626',
  },
  prefix: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 8,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  errorText: {
    marginTop: 4,
    fontSize: 13,
    color: '#dc2626',
  },
});
