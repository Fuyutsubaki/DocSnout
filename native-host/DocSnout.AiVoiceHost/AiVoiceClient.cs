// このファイルは A.I.VOICE Editor API を呼び出して再生・停止・状態取得を行うクライアントを提供します。
using System.Reflection;

namespace DocSnout.AiVoiceHost;

internal sealed class AiVoiceClient : IDisposable
{
    private const string ApiTypeName = "AI.Talk.Editor.Api.TtsControl";
    private const string EnvApiDll = "DOCSNOUT_AIVOICE_API_DLL";
    private const string EnvHostName = "DOCSNOUT_AIVOICE_HOSTNAME";
    private readonly object gate = new();

    private Assembly? apiAssembly;
    private Type? ttsType;
    private object? tts;
    private string currentHostName = "";
    private Timer? keepAliveTimer;
    private string lastError = "";

    public void Dispose()
    {
        lock (gate)
        {
            keepAliveTimer?.Dispose();
            keepAliveTimer = null;
            tts = null;
            ttsType = null;
            apiAssembly = null;
        }
    }

    public (bool ok, object data) GetStatus()
    {
        lock (gate)
        {
            try
            {
                EnsureLoaded();
            }
            catch (Exception e)
            {
                lastError = e.Message;
                return (true, new { status = "Unavailable", hostName = currentHostName, lastError });
            }

            var status = SafeGetStatusString();
            return (true, new { status, hostName = currentHostName, lastError });
        }
    }

    public (bool ok, object data) Stop()
    {
        lock (gate)
        {
            try
            {
                EnsureLoaded();
                var status = SafeGetStatusString();
                if (status == "NotConnected" || status == "NotRunning" || string.IsNullOrEmpty(status))
                {
                    return (true, new { status = "NotConnected" });
                }
            }
            catch (Exception e)
            {
                lastError = e.Message;
                return (true, new { status = "NotConnected" });
            }

            try
            {
                ttsType.GetMethod("Stop")?.Invoke(tts, null);
                return (true, new { status = SafeGetStatusString() });
            }
            catch (Exception e)
            {
                lastError = e.Message;
                return (false, new { status = SafeGetStatusString(), error = e.Message });
            }
        }
    }

    public (bool ok, object data) Play(string text)
    {
        lock (gate)
        {
            EnsureConnected();
            if (tts is null || ttsType is null)
            {
                return (false, new { });
            }

            try
            {
                var textProp = ttsType.GetProperty("Text");
                textProp?.SetValue(tts, text);

                ttsType.GetMethod("Play")?.Invoke(tts, null);
                return (true, new { status = SafeGetStatusString() });
            }
            catch (TargetInvocationException tie)
            {
                lastError = tie.InnerException?.Message ?? tie.Message;
                // 10分無操作等で切断されることがあるため、再接続→リトライを1回だけ行う
                try
                {
                    EnsureConnected(forceReconnect: true);
                    var textProp = ttsType.GetProperty("Text");
                    textProp?.SetValue(tts, text);
                    ttsType.GetMethod("Play")?.Invoke(tts, null);
                    return (true, new { status = SafeGetStatusString() });
                }
                catch (Exception e2)
                {
                    lastError = e2.Message;
                    return (false, new { status = SafeGetStatusString(), error = lastError });
                }
            }
            catch (Exception e)
            {
                lastError = e.Message;
                return (false, new { status = SafeGetStatusString(), error = lastError });
            }
        }
    }

    private void EnsureLoaded()
    {
        if (tts is not null && ttsType is not null) return;

        var dllPath = Environment.GetEnvironmentVariable(EnvApiDll);
        if (string.IsNullOrWhiteSpace(dllPath))
        {
            dllPath = GuessApiDllPath();
        }

        if (string.IsNullOrWhiteSpace(dllPath) || !File.Exists(dllPath))
        {
            throw new FileNotFoundException(
                $"A.I.VOICE Editor API の DLL が見つかりません。環境変数 {EnvApiDll} に AI.Talk.Editor.Api.dll のパスを指定してください。",
                dllPath ?? "");
        }

        apiAssembly = Assembly.LoadFrom(dllPath);
        ttsType = apiAssembly.GetType(ApiTypeName, throwOnError: true, ignoreCase: false);
        tts = Activator.CreateInstance(ttsType!);
    }

    private void EnsureConnected(bool forceReconnect = false)
    {
        EnsureLoaded();
        if (tts is null || ttsType is null) return;

        if (forceReconnect)
        {
            SafeDisconnect();
        }

        var status = SafeGetStatusString();
        if (status == "NotConnected" || status == "NotRunning" || string.IsNullOrEmpty(status))
        {
            ConnectOrStartHost();
        }

        keepAliveTimer ??= new Timer(_ => SafeKeepAliveTick(), null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    private void ConnectOrStartHost()
    {
        if (tts is null || ttsType is null) return;

        var hostNames = GetAvailableHostNames();
        var forced = Environment.GetEnvironmentVariable(EnvHostName) ?? "";
        var desired = !string.IsNullOrWhiteSpace(forced)
            ? forced.Trim()
            : hostNames.FirstOrDefault() ?? "";
        if (string.IsNullOrEmpty(desired))
        {
            throw new InvalidOperationException("利用可能な HostName を取得できませんでした（A.I.VOICE Editor が未インストールの可能性）");
        }

        if (!string.Equals(currentHostName, desired, StringComparison.Ordinal))
        {
            currentHostName = desired;
            ttsType.GetMethod("Initialize")?.Invoke(tts, new object[] { currentHostName });
        }

        try
        {
            ttsType.GetMethod("Connect")?.Invoke(tts, null);
            lastError = "";
            return;
        }
        catch
        {
            // StartHost -> Connect の順で再試行
        }

        ttsType.GetMethod("StartHost")?.Invoke(tts, null);
        ttsType.GetMethod("Connect")?.Invoke(tts, null);
        lastError = "";
    }

    private string[] GetAvailableHostNames()
    {
        if (tts is null || ttsType is null) return Array.Empty<string>();
        var method = ttsType.GetMethod("GetAvailableHostNames");
        if (method is null) return Array.Empty<string>();
        var result = method.Invoke(tts, null);
        return result as string[] ?? Array.Empty<string>();
    }

    private void SafeDisconnect()
    {
        try
        {
            if (tts is null || ttsType is null) return;
            ttsType.GetMethod("Disconnect")?.Invoke(tts, null);
        }
        catch
        {
            // no-op
        }
    }

    private string SafeGetStatusString()
    {
        try
        {
            if (tts is null || ttsType is null) return "";
            var prop = ttsType.GetProperty("Status");
            var value = prop?.GetValue(tts);
            return value?.ToString() ?? "";
        }
        catch (Exception e)
        {
            lastError = e.Message;
            return "";
        }
    }

    private void SafeKeepAliveTick()
    {
        lock (gate)
        {
            try
            {
                var status = SafeGetStatusString();
                if (status == "NotConnected" || status == "NotRunning")
                {
                    ConnectOrStartHost();
                }
            }
            catch (Exception e)
            {
                lastError = e.Message;
            }
        }
    }

    private static string GuessApiDllPath()
    {
        var roots = new[]
        {
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
            Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),
        }.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase);

        foreach (var root in roots)
        {
            var candidates = new[]
            {
                Path.Combine(root, "A.I.VOICE", "A.I.VOICE Editor", "AI.Talk.Editor.Api.dll"),
                Path.Combine(root, "AI", "A.I.VOICE Editor", "AI.Talk.Editor.Api.dll"),
                Path.Combine(root, "AI", "A.I.VOICE", "A.I.VOICE Editor", "AI.Talk.Editor.Api.dll"),
            };

            foreach (var c in candidates)
            {
                if (File.Exists(c)) return c;
            }
        }

        return "";
    }
}
