defmodule Jenot.Web do
  @moduledoc """
  Web server
  """

  use Plug.Router

  alias Jenot.Accounts
  alias Jenot.Notes

  @template_dir "lib/jenot/templates"

  @templates @template_dir
             |> File.ls!()
             |> Enum.map(fn file ->
               {
                 String.replace_suffix(file, ".html.heex", ".html"),
                 File.read!(Path.join(@template_dir, file))
               }
             end)
             |> Map.new()

  if Mix.env() == :dev do
    plug PlugLiveReload
  end

  plug Plug.Logger

  plug :service_worker_header

  plug Plug.Static,
    at: "/",
    only: ~w(img js index.html test.html site.webmanifest style.css),
    from: {:jenot, "priv/static"}

  plug Plug.Parsers,
    parsers: [:urlencoded, :json],
    pass: ["*/*"],
    json_decoder: Jason

  plug :put_secret_key_base

  plug :match
  plug :dispatch

  get "/" do
    conn
    |> resp(:found, "")
    |> put_resp_header("location", "/index.html")
  end

  post "/account/new" do
    case Accounts.new() do
      {:ok, %{code: code, account: account}} ->
        conn
        |> Accounts.set_cookie(account.id)
        |> render("new_account.html", name: account.name, code: code)

      {:error, _} ->
        conn
        |> Accounts.clear_cookie()
        |> resp(:found, "")
        |> put_resp_header("location", "/index.html")
    end
  end

  get "/account/authenticate" do
    render(conn, "account_authenticate.html", error: nil)
  end

  post "/account/authenticate" do
    case Accounts.authenticate(conn.params["name"], conn.params["code"]) do
      {:ok, account} ->
        conn
        |> Accounts.set_cookie(account.id)
        |> resp(:found, "")
        |> put_resp_header("location", "/index.html?reset-meta")

      {:error, _} ->
        conn
        |> put_status(422)
        |> render("account_authenticate.html", error: "Account not found")
    end
  end

  post "/account/logout" do
    conn
    |> Accounts.clear_cookie()
    |> resp(:found, "")
    |> put_resp_header("location", "/index.html?reset-meta")
  end

  get "/api" do
    send_resp(conn, 200, """
      Jenot API says hi!
    """)
  end

  get "/api/latest" do
    {:ok, account} = Accounts.get_by_cookie(conn)

    send_resp(conn, 200, Jason.encode!(%{notes: Notes.latest_change(account)}))
  end

  get "/api/notes" do
    {:ok, account} = Accounts.get_by_cookie(conn)

    notes =
      account
      |> Notes.all(conn.params["since"], conn.params["deleted"] == "true")
      |> Enum.map(&Notes.serialize/1)

    send_resp(conn, 200, Jason.encode!(notes))
  end

  get "/api/notes/:internal_id" do
    {:ok, account} = Accounts.get_by_cookie(conn)

    case Notes.note_by_internal_id(account, internal_id) do
      {:ok, note} ->
        note = Notes.serialize(note)
        send_resp(conn, 200, Jason.encode!(note))

      {:error, :note_not_found} ->
        send_resp(conn, 404, Jason.encode!(%{error: "Note not found"}))
    end
  end

  post "/api/notes" do
    {:ok, account} = Accounts.get_by_cookie(conn)

    case Notes.add(account, conn.params) do
      {:ok, note} ->
        send_resp(conn, 200, Jason.encode!(Notes.serialize(note)))

      {:error, _} ->
        send_resp(conn, 422, Jason.encode!(%{error: "Invalid input data"}))
    end
  end

  put "/api/notes/:internal_id" do
    {:ok, account} = Accounts.get_by_cookie(conn)

    case Notes.update(account, internal_id, conn.params) do
      {:ok, note} ->
        send_resp(conn, 200, Jason.encode!(Notes.serialize(note)))

      {:error, :note_not_found} ->
        send_resp(conn, 422, Jason.encode!(%{error: "Note does not exist"}))

      {:error, :invalid_data} ->
        send_resp(conn, 422, Jason.encode!(%{error: "Invalid input data"}))
    end
  end

  delete "/api/notes/:internal_id" do
    {:ok, account} = Accounts.get_by_cookie(conn)

    :ok = Notes.delete(account, internal_id)

    send_resp(conn, 200, Jason.encode!(%{deleted: true}))
  end

  get "/api/push/public-key" do
    public_key = Application.fetch_env!(:web_push_elixir, :vapid_public_key)
    send_resp(conn, 200, Jason.encode!(%{public_key: public_key}))
  end

  post "/api/push/subscribe" do
    send_resp(conn, 200, "")
  end

  post "/api/push/unsubscribe" do
    send_resp(conn, 200, "")
  end

  match _ do
    send_resp(conn, 404, "not found")
  end

  defp service_worker_header(conn, _opts) do
    put_resp_header(conn, "service-worker-allowed", "/")
  end

  defp render(%{status: status} = conn, template, assigns) do
    body =
      @templates
      |> Map.fetch!(template)
      |> EEx.eval_string(assigns)

    send_resp(conn, status || 200, body)
  end

  def put_secret_key_base(conn, _) do
    put_in(conn.secret_key_base, Application.fetch_env!(:jenot, :secret_key_base))
  end
end
