using System.Text.Json;

namespace DocSnout.AiVoiceHost;

internal static class Program
{
    private static int Main(string[] args)
    {
        if (args.Contains("--help", StringComparer.OrdinalIgnoreCase))
        {
            Console.WriteLine("DocSnout.AiVoiceHost (Native Messaging Host)");
            Console.WriteLine("ENV: DOCSNOUT_AIVOICE_API_DLL=AI.Talk.Editor.Api.dll のパス");
            return 0;
        }

        using var client = new AiVoiceClient();
        var stdin = Console.OpenStandardInput();
        var stdout = Console.OpenStandardOutput();

        while (true)
        {
            JsonDocument? doc = null;
            try
            {
                doc = NativeMessaging.ReadMessage(stdin);
                if (doc is null) break;

                var root = doc.RootElement;
                var id = NativeMessaging.GetString(root, "id");
                var type = NativeMessaging.GetString(root, "type");

                if (string.Equals(type, "status", StringComparison.Ordinal))
                {
                    var (ok, data) = client.GetStatus();
                    NativeMessaging.WriteMessage(stdout, new { id, ok, data });
                    continue;
                }

                if (string.Equals(type, "stop", StringComparison.Ordinal))
                {
                    var (ok, data) = client.Stop();
                    NativeMessaging.WriteMessage(stdout, new { id, ok, data });
                    continue;
                }

                if (string.Equals(type, "play", StringComparison.Ordinal))
                {
                    var text = NativeMessaging.GetString(root, "text");
                    if (string.IsNullOrWhiteSpace(text))
                    {
                        NativeMessaging.WriteMessage(stdout, new
                        {
                            id,
                            ok = false,
                            error = new { code = "EMPTY_TEXT", message = "text が空です" },
                        });
                        continue;
                    }

                    var (ok, data) = client.Play(text);
                    if (ok)
                    {
                        NativeMessaging.WriteMessage(stdout, new { id, ok, data });
                    }
                    else
                    {
                        NativeMessaging.WriteMessage(stdout, new
                        {
                            id,
                            ok,
                            data,
                            error = new { code = "AIVOICE_ERROR", message = "A.I.VOICE の操作に失敗しました" },
                        });
                    }
                    continue;
                }

                NativeMessaging.WriteMessage(stdout, new
                {
                    id,
                    ok = false,
                    error = new { code = "UNKNOWN_TYPE", message = $"未対応のtypeです: {type}" },
                });
            }
            catch (Exception e)
            {
                var id = "";
                try
                {
                    if (doc is not null)
                    {
                        id = NativeMessaging.GetString(doc.RootElement, "id");
                    }
                }
                catch
                {
                    // no-op
                }

                NativeMessaging.WriteMessage(stdout, new
                {
                    id,
                    ok = false,
                    error = new { code = "HOST_ERROR", message = e.Message },
                });
            }
            finally
            {
                doc?.Dispose();
            }
        }

        return 0;
    }
}

