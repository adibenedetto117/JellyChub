import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    isLoggedIn,
    activeServerId,
    servers,
    protocol,
    host,
    port,
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
    handleProtocolChange,
    handleHostChange,
    handlePortChange,
    toggleAdvanced,
    openAddServer,
    addCustomHeader,
    updateCustomHeader,
    removeCustomHeader,
    handleGoBack,
  } = useServerSelectScreen();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {isLoggedIn && (
        <Pressable
          className="flex-row items-center px-4 py-3"
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text className="text-white ml-2">Back to App</Text>
        </Pressable>
      )}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title="JellyChub"
          subtitle={isLoggedIn ? "Manage your servers" : "Your media, everywhere"}
        />

        <ServerList
          servers={servers}
          connectionStatus={connectionStatus}
          activeServerId={activeServerId}
          onSelectServer={handleSelectServer}
          onRemoveServer={handleRemoveServer}
        />

        {showAddServer ? (
          <AddServerForm
            protocol={protocol}
            host={host}
            port={port}
            isValidating={isValidating}
            error={error}
            showAdvanced={showAdvanced}
            customHeaders={customHeaders}
            hasExistingServers={servers.length > 0}
            onProtocolChange={handleProtocolChange}
            onHostChange={handleHostChange}
            onPortChange={handlePortChange}
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
