defmodule Jenot.Notes do
  import Ecto.Query

  alias Jenot.Note
  alias Jenot.Repo

  def serialize(note) do
    Map.take(note, [:internal_id, :title, :content, :inserted_at, :updated_at])
  end

  def latest_change(account) do
    Note
    |> where(account_id: ^account.id)
    |> select([a], max(a.updated_at))
    |> Repo.one()
  end

  def all(account, since \\ nil) do
    Note
    |> where(account_id: ^account.id)
    |> maybe_filter_since(since)
    |> Repo.all()
  end

  def add(account, params) do
    changeset = Note.new(account, params)

    case upsert(changeset, target: [:account_id, :internal_id]) do
      {:ok, note} -> {:ok, note}
      {:error, _changeset} -> {:error, :invalid_data}
    end
  end

  def note_by_internal_id(account, internal_id) do
    note = Repo.get_by(Note, account_id: account.id, internal_id: internal_id)

    if note do
      {:ok, note}
    else
      {:error, :note_not_found}
    end
  end

  def update(account, internal_id, params) do
    with {:ok, note} <- note_by_internal_id(account, internal_id) do
      changeset = Note.update(note, params)

      case upsert(changeset, target: [:id]) do
        {:ok, note} -> {:ok, note}
        {:error, _changeset} -> {:error, :invalid_data}
      end
    end
  end

  def delete(account, internal_id) do
    Note
    |> where(account_id: ^account.id, internal_id: ^internal_id)
    |> Repo.delete_all()

    :ok
  end

  defp maybe_filter_since(query, nil), do: query

  defp maybe_filter_since(query, datetime) do
    where(query, [n], n.updated_at > ^datetime)
  end

  defp upsert(changeset, opts) do
    conflict_target = Keyword.fetch!(opts, :target)
    title = Ecto.Changeset.get_field(changeset, :title) || ""
    content = Ecto.Changeset.get_field(changeset, :content) || ""

    Repo.insert(changeset,
      on_conflict: [set: [title: title, content: content, updated_at: DateTime.utc_now()]],
      conflict_target: conflict_target,
      returning: true
    )
  end
end
