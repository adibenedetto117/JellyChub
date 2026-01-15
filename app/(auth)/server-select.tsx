import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from '@/providers';
import { useServerSelectScreen } from '@/hooks';
import {
  AuthHeader,
  ServerList,
  AddServerForm,
  AddServerButton,
  OfflineModeButton,
} from '@/components/shared/auth';

export default function ServerSelectScreen() {
  const {
    servers,
    serverUrl,
    isValidating,
    error,
    showAddServer,
    connectionStatus,
    showAdvanced,
    customHeaders,
    handleAddServer,
    handleSelectServer,
    handleRemoveServer,
    handleEnterOfflineMode,
    handleCancelAddServer,
    handleServerUrlChange,
    toggleAdvanced,
    openAddServer,
    addCustomHeader,
    updateCustomHeader,
    removeCustomHeader,
  } = useServerSelectScreen();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader title="JellyChub" subtitle="Your media, everywhere" />

        <ServerList
          servers={servers}
          connectionStatus={connectionStatus}
          onSelectServer={handleSelectServer}
          onRemoveServer={handleRemoveServer}
        />

        {showAddServer ? (
          <AddServerForm
            serverUrl={serverUrl}
            isValidating={isValidating}
            error={error}
            showAdvanced={showAdvanced}
            customHeaders={customHeaders}
            hasExistingServers={servers.length > 0}
            onServerUrlChange={handleServerUrlChange}
            onToggleAdvanced={toggleAdvanced}
            onAddHeader={addCustomHeader}
            onUpdateHeader={updateCustomHeader}
            onRemoveHeader={removeCustomHeader}
            onSubmit={handleAddServer}
            onCancel={handleCancelAddServer}
          />
        ) : (
          <AddServerButton onPress={openAddServer} />
        )}

        <OfflineModeButton onPress={handleEnterOfflineMode} />

        <View className="mt-8 items-center">
          <Text className="text-text-muted text-xs">Jellyfin Client</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
