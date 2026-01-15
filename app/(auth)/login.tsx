import { ScrollView } from 'react-native';
import { SafeAreaView } from '@/providers';
import { useTranslation } from 'react-i18next';
import { useLoginScreen } from '@/hooks';
import {
  BackButton,
  ServerBranding,
  PublicUserSelector,
  LoginForm,
  QuickConnectButton,
  QuickConnectView,
} from '@/components/shared/auth';

export default function LoginScreen() {
  const { t } = useTranslation();
  const {
    username,
    password,
    showPassword,
    isLoading,
    error,
    publicUsers,
    showQuickConnect,
    quickConnectCode,
    serverName,
    serverVersion,
    isLoadingServerInfo,
    accentColor,
    handleLogin,
    handleQuickConnect,
    handleSelectUser,
    handleBack,
    handleCancelQuickConnect,
    handleUsernameChange,
    handlePasswordChange,
    toggleShowPassword,
  } = useLoginScreen();

  if (showQuickConnect && quickConnectCode) {
    return (
      <QuickConnectView
        code={quickConnectCode}
        accentColor={accentColor}
        onCancel={handleCancelQuickConnect}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackButton label={t('auth.servers')} onPress={handleBack} />

        <ServerBranding
          serverName={serverName}
          serverVersion={serverVersion}
          isLoading={isLoadingServerInfo}
        />

        <PublicUserSelector
          users={publicUsers}
          selectedUsername={username}
          onSelectUser={handleSelectUser}
        />

        <LoginForm
          username={username}
          password={password}
          showPassword={showPassword}
          isLoading={isLoading}
          error={error}
          onUsernameChange={handleUsernameChange}
          onPasswordChange={handlePasswordChange}
          onTogglePassword={toggleShowPassword}
          onSubmit={handleLogin}
        />

        <QuickConnectButton onPress={handleQuickConnect} />
      </ScrollView>
    </SafeAreaView>
  );
}
