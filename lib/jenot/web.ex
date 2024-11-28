defmodule Jenot.Web do
  @moduledoc """
  Web server
  """

  use Plug.Router

  alias Jenot.Accounts
  alias Jenot.Notes

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

  plug :match
  plug :dispatch

  get "/" do
    conn
    |> resp(:found, "")
    |> put_resp_header("location", "/index.html")
  end

  get "/api" do
    send_resp(conn, 200, """
      Jenot API says hi!
    """)
  end

  get "/api/latest" do
    account = Accounts.get()

    send_resp(conn, 200, Jason.encode!(%{notes: Notes.latest_change(account)}))
  end

  get "/api/notes" do
    account = Accounts.get()

    notes =
      account
      |> Notes.all(conn.params["since"], conn.params["deleted"] == "true")
      |> Enum.map(&Notes.serialize/1)

    send_resp(conn, 200, Jason.encode!(notes))
  end

  get "/api/notes/:internal_id" do
    account = Accounts.get()

    case Notes.note_by_internal_id(account, internal_id) do
      {:ok, note} ->
        note = Notes.serialize(note)
        send_resp(conn, 200, Jason.encode!(note))

      {:error, :note_not_found} ->
        send_resp(conn, 404, Jason.encode!(%{error: "Note not found"}))
    end
  end

  post "/api/notes" do
    account = Accounts.get()

    case Notes.add(account, conn.params) do
      {:ok, note} ->
        send_resp(conn, 200, Jason.encode!(Notes.serialize(note)))

      {:error, _} ->
        send_resp(conn, 422, Jason.encode!(%{error: "Invalid input data"}))
    end
  end

  put "/api/notes/:internal_id" do
    account = Accounts.get()

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
    account = Accounts.get()

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
end
