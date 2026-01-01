// このファイルは Chrome Native Messaging のメッセージを読み書きする処理を提供します。
using System.Text;
using System.Text.Json;

namespace DocSnout.AiVoiceHost;

internal static class NativeMessaging
{
    public static JsonDocument? ReadMessage(Stream input)
    {
        var lengthBytes = new byte[4];
        var read = input.Read(lengthBytes, 0, 4);
        if (read == 0) return null;
        if (read < 4) throw new EndOfStreamException("Native Messaging の長さヘッダーが不完全です");

        var length = BitConverter.ToInt32(lengthBytes, 0);
        if (length <= 0 || length > 20_000_000) throw new InvalidDataException($"メッセージ長が不正です: {length}");

        var payload = new byte[length];
        var offset = 0;
        while (offset < length)
        {
            var n = input.Read(payload, offset, length - offset);
            if (n <= 0) throw new EndOfStreamException("Native Messaging の本文が途中で途切れました");
            offset += n;
        }

        return JsonDocument.Parse(payload);
    }

    public static void WriteMessage(Stream output, object message)
    {
        var json = JsonSerializer.SerializeToUtf8Bytes(message, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
        });

        var lengthBytes = BitConverter.GetBytes(json.Length);
        output.Write(lengthBytes, 0, lengthBytes.Length);
        output.Write(json, 0, json.Length);
        output.Flush();
    }

    public static string GetString(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop)) return "";
        if (prop.ValueKind == JsonValueKind.String) return prop.GetString() ?? "";
        return prop.ToString();
    }
}
