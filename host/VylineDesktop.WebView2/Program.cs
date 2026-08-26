using System.Diagnostics;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace VylineDesktop.WebView2;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}

internal sealed class MainForm : Form
{
    private readonly Microsoft.Web.WebView2.WinForms.WebView2 webView = new() { Dock = DockStyle.Fill };
    private readonly Label status = new()
    {
        Dock = DockStyle.Fill,
        Text = "Vyline を起動しています…",
        TextAlign = ContentAlignment.MiddleCenter,
    };
    private Process? backend;
    private StreamWriter? backendLog;
    private int backendPort;

    public MainForm()
    {
        Text = "Vyline";
        Width = 1280;
        Height = 820;
        MinimumSize = new Size(900, 620);
        BackColor = Color.FromArgb(17, 19, 24);
        Controls.Add(webView);
        Controls.Add(status);
        webView.Visible = false;
        Shown += async (_, _) => await StartAsync();
        FormClosed += (_, _) => StopBackend();
    }

    private async Task StartAsync()
    {
        try
        {
            backendPort = ReserveLoopbackPort();
            StartBackend(backendPort);
            await WaitForBackendAsync(backendPort);

            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Vyline",
                "Desktop",
                "WebView2");
            Directory.CreateDirectory(userData);

            var environment = await CoreWebView2Environment.CreateAsync(null, userData);
            await webView.EnsureCoreWebView2Async(environment);
            ConfigureWebView();
            webView.Source = new Uri($"http://127.0.0.1:{backendPort}/");
            status.Visible = false;
            webView.Visible = true;
        }
        catch (Exception error)
        {
            status.Text = $"Vyline の起動に失敗しました。\n\n{error.Message}";
            status.ForeColor = Color.White;
        }
    }

    private void StartBackend(int port)
    {
        var root = AppContext.BaseDirectory;
        var backendPath = Path.Combine(root, "resources", "vyline-backend.exe");
        if (!File.Exists(backendPath))
            throw new FileNotFoundException("Vyline backend が見つかりません。", backendPath);

        var dataRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Vyline",
            "Desktop",
            "data");
        var storageRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Vyline",
            "Desktop",
            "storage");
        Directory.CreateDirectory(dataRoot);
        Directory.CreateDirectory(storageRoot);

        backend = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = backendPath,
                WorkingDirectory = root,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            },
            EnableRaisingEvents = true,
        };
        backend.StartInfo.Environment["NODE_ENV"] = "production";
        backend.StartInfo.Environment["VYLINE_BACKEND_PRETTY_LOGS"] = "false";
        backend.StartInfo.Environment["PORT"] = port.ToString();
        backend.StartInfo.Environment["VYLINE_BACKEND_PORT"] = port.ToString();
        backend.StartInfo.Environment["VYLINE_HOST"] = "127.0.0.1";
        backend.StartInfo.Environment["VYLINE_STATIC_DIR"] = Path.Combine(root, "wwwroot");
        backend.StartInfo.Environment["VYLINE_PROFILE_PATH"] = Path.Combine(root, "resources", "desktop-profile.fallback.json");
        backend.StartInfo.Environment["VYLINE_DATA_DIR"] = dataRoot;
        backend.StartInfo.Environment["VYLINE_STORAGE_DIR"] = storageRoot;
        backend.StartInfo.Environment["VYLINE_LOG_DIR"] = Path.Combine(dataRoot, "logs");
        backend.StartInfo.Environment["VYLINE_CORS_ORIGIN"] = $"http://127.0.0.1:{port}";
        backendLog = new StreamWriter(Path.Combine(dataRoot, "desktop-host.log"), append: true) { AutoFlush = true };
        backend.OutputDataReceived += (_, args) => WriteBackendLog(args.Data);
        backend.ErrorDataReceived += (_, args) => WriteBackendLog(args.Data);
        backend.Exited += (_, _) =>
        {
            if (!IsDisposed) BeginInvoke(() => status.Text = "Vyline backend が終了しました。");
        };
        backend.Start();
        backend.BeginOutputReadLine();
        backend.BeginErrorReadLine();
    }

    private void WriteBackendLog(string? line)
    {
        if (string.IsNullOrWhiteSpace(line)) return;
        Debug.WriteLine(line);
        try { backendLog?.WriteLine(line); }
        catch (ObjectDisposedException) { }
    }

    private void ConfigureWebView()
    {
        var core = webView.CoreWebView2;
        core.Settings.AreDevToolsEnabled = false;
        core.Settings.AreDefaultContextMenusEnabled = true;
        core.Settings.IsStatusBarEnabled = false;
        core.NavigationStarting += (_, args) =>
        {
            if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) ||
                uri.Scheme != Uri.UriSchemeHttp ||
                uri.Host != "127.0.0.1" ||
                uri.Port != backendPort)
            {
                args.Cancel = true;
                if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var external))
                    Process.Start(new ProcessStartInfo(external.ToString()) { UseShellExecute = true });
            }
        };
        core.NewWindowRequested += (_, args) =>
        {
            args.Handled = true;
            if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var external))
                Process.Start(new ProcessStartInfo(external.ToString()) { UseShellExecute = true });
        };
    }

    private static int ReserveLoopbackPort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private async Task WaitForBackendAsync(int port)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(500) };
        var deadline = DateTime.UtcNow.AddSeconds(15);
        while (DateTime.UtcNow < deadline)
        {
            try
            {
                using var response = await client.GetAsync($"http://127.0.0.1:{port}/healthz");
                if (response.IsSuccessStatusCode) return;
            }
            catch (HttpRequestException) { }
            catch (TaskCanceledException) { }

            if (backend?.HasExited == true)
                throw new InvalidOperationException("Vyline backend が起動直後に終了しました。");
            await Task.Delay(150);
        }

        throw new TimeoutException("Vyline backend の起動がタイムアウトしました。");
    }

    private void StopBackend()
    {
        if (backend is { HasExited: false })
        {
            try { backend.Kill(entireProcessTree: true); }
            catch (InvalidOperationException) { }
        }
        backendLog?.Dispose();
        backendLog = null;
    }
}
