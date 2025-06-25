import React, { useState, useEffect } from 'react';
import { Text, Box, useInput } from 'ink';
import { loadSettings, SettingScope } from './settings.js';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import ollama from 'ollama';

const settings = loadSettings(process.cwd());

async function testConnection(
  provider: string,
  config: Record<string, string>,
) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Connection timed out after 5 seconds')), 5000),
  );

  if (provider === 'openai') {
    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
      await Promise.race([openai.models.list(), timeoutPromise]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else if (provider === 'claude') {
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey: config.apiKey });
      await Promise.race([
        anthropic.messages.create({
          model: 'claude-3-opus-20240229',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
        timeoutPromise,
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  } else if (provider === 'ollama') {
    try {
      ollama.host = config.baseUrl || 'http://localhost:11434';
      await Promise.race([ollama.list(), timeoutPromise]);
      return { success: true };
    } catch (error) {
      if (error.cause?.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: `Could not connect to Ollama at ${ollama.host}. Is the Ollama service running?`,
        };
      }
      return { success: false, error: error.message };
    }
  }
  return { success: true }; // Assume other providers are fine
}

export default function Config() {
  const [provider, setProvider] = useState(
    settings.merged.provider || 'gemini',
  );
  const [providers, setProviders] = useState(
    settings.merged.providers || {
      gemini: { model: 'gemini-2.5-pro' },
      openai: {
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      },
      claude: { apiKey: '', model: 'claude-opus-4-20250514' },
      ollama: { baseUrl: 'http://localhost:11434', model: 'llama3' },
    },
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { success: boolean; error?: string } | undefined
  >(undefined);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => {
    if (provider === 'ollama') {
      ollama.host =
        providers.ollama.baseUrl || 'http://localhost:11434';
      ollama.list().then((list) => {
        setOllamaModels(list.models.map((model) => model.name));
      });
    }
  }, [provider, providers.ollama.baseUrl]);

  useInput((input, key) => {
    if (key.escape) {
      setEditing(null);
    }
  });

  const handleProviderSelect = (item) => {
    if (item.value === 'reset') {
      settings.deleteValue(SettingScope.User, 'provider');
      settings.deleteValue(SettingScope.User, 'providers');
      setProvider('gemini');
      setProviders({ gemini: { model: 'gemini-1.5-pro-latest' } });
    } else {
      setProvider(item.value);
      settings.setValue(SettingScope.User, 'provider', item.value);
    }
  };

  const handleEdit = (key: string) => {
    setEditing(key);
    setEditValue(providers[provider]?.[key] || '');
  };

  const handleValueChange = (value: string) => {
    setEditValue(value);
  };

  const handleValueSubmit = async () => {
    const newProviders = {
      ...providers,
      [provider]: {
        ...providers[provider],
        [editing!]: editValue,
      },
    };

    setTesting(true);
    const result = await testConnection(provider, newProviders[provider]);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      setProviders(newProviders);
      settings.setValue(SettingScope.User, 'providers', newProviders);
      setEditing(null);
    }
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text>Select Provider:</Text>
        <SelectInput
          items={[
            { label: 'Gemini', value: 'gemini' },
            { label: 'OpenAI', value: 'openai' },
            { label: 'Claude', value: 'claude' },
            { label: 'Ollama', value: 'ollama' },
            { label: '[ Reset to default ]', value: 'reset' },
          ]}
          onSelect={handleProviderSelect}
        />
      </Box>
      <Box>
        <Text>Current Provider: {provider}</Text>
      </Box>
      <Box flexDirection="column">
        <Text>Settings for {provider}:</Text>
        {Object.entries(providers[provider] || {}).map(([key, value]) => (
          <Box key={key}>
            <Text>
              {key}: {editing === key ? '' : value}
            </Text>
            {editing === key ? (
              key === 'model' && provider === 'ollama' ? (
                <SelectInput
                  items={ollamaModels.map((model) => ({
                    label: model,
                    value: model,
                  }))}
                  onSelect={(item) => {
                    setEditValue(item.value);
                    handleValueSubmit();
                  }}
                />
              ) : (
                <TextInput
                  value={editValue}
                  onChange={handleValueChange}
                  onSubmit={handleValueSubmit}
                />
              )
            ) : (
              <Text> </Text>
            )}
            <Text> </Text>
            <Text
              color="cyan"
              underline
              onPress={() => handleEdit(key)}
            >
              Edit
            </Text>
          </Box>
        ))}
      </Box>
      {testing && (
        <Box>
          <Spinner />
          <Text> Testing connection...</Text>
        </Box>
      )}
      {testResult && (
        <Box>
          {testResult.success ? (
            <Text color="green">✓ Connection successful!</Text>
          ) : (
            <Text color="red">✗ Connection failed: {testResult.error}</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
