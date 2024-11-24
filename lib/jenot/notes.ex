defmodule Jenot.Notes do
  import Ecto.Query

  alias Jenot.Note
  alias Jenot.Repo

  def serialize(note) do
    serialize_note(note)
  end

  def latest_change(account) do
    Note
    |> where(account_id: ^account.id)
    |> where([n], is_nil(n.deleted_at))
    |> select([n], max(n.updated_at))
    |> Repo.one()
  end

  def all(account, since \\ nil, include_deleted? \\ false) do
    Note
    |> where(account_id: ^account.id)
    |> maybe_include_deleted(include_deleted?)
    |> maybe_filter_since(since)
    |> Repo.all()
  end

  def add(account, params) do
    params = deserialize_params(params)
    changeset = Note.new(account, params)

    case upsert(changeset, target: [:account_id, :internal_id]) do
      {:ok, note} -> {:ok, note}
      {:error, _changeset} -> {:error, :invalid_data}
    end
  end

  def note_by_internal_id(account, internal_id) do
    note =
      Note
      |> where(account_id: ^account.id)
      |> where(internal_id: ^internal_id)
      |> Repo.one()

    if note do
      {:ok, note}
    else
      {:error, :note_not_found}
    end
  end

  def update(account, internal_id, params) do
    params = deserialize_params(params)

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
    |> Repo.update_all(set: [deleted_at: DateTime.utc_now(), updated_at: DateTime.utc_now()])

    :ok
  end

  defp deserialize_params(params) do
    params =
      case Map.get(params, "content", Map.get(params, :content)) do
        data when is_list(data) -> Map.put(params, "content", Jason.encode!(data))
        _ -> params
      end

    case Map.get(params, "id", Map.get(params, :id)) do
      nil ->
        params

      internal_id ->
        params
        |> Map.delete("id")
        |> Map.delete(:id)
        |> Map.put("internal_id", internal_id)
        |> deserialize_timestamp(:deleted, :deleted_at)
        |> deserialize_timestamp(:created, :inserted_at)
        |> deserialize_timestamp(:updated, :updated_at)
    end
  end

  defp serialize_note(note) do
    note =
      note
      |> Map.take([:title, :type, :content, :inserted_at, :updated_at, :deleted_at])
      |> Map.put(:id, note.internal_id)
      |> serialize_timestamp(:deleted_at, :deleted)
      |> serialize_timestamp(:inserted_at, :created)
      |> serialize_timestamp(:updated_at, :updated)

    if note.type == :tasklist and not is_nil(note.content) do
      %{note | content: Jason.decode!(note.content)}
    else
      note
    end
  end

  defp deserialize_timestamp(params, src_key, dst_key) do
    str_src_key = to_string(src_key)

    value =
      case Map.get(params, str_src_key, Map.get(params, src_key)) do
        nil -> nil
        unix_time -> DateTime.from_unix!(unix_time, :millisecond)
      end

    params
    |> Map.delete(src_key)
    |> Map.delete(str_src_key)
    |> Map.put(to_string(dst_key), value)
  end

  defp serialize_timestamp(data, src_key, dst_key) do
    value =
      case data[src_key] do
        nil -> nil
        dt -> DateTime.to_unix(dt, :millisecond)
      end

    data
    |> Map.delete(src_key)
    |> Map.put(dst_key, value)
  end

  defp maybe_include_deleted(q, true), do: q

  defp maybe_include_deleted(q, false) do
    where(q, [n], is_nil(n.deleted_at))
  end

  defp maybe_filter_since(query, nil), do: query

  defp maybe_filter_since(query, unix_time) do
    datetime =
      unix_time
      |> String.to_integer()
      |> DateTime.from_unix!(:millisecond)

    where(query, [n], n.updated_at > ^datetime)
  end

  defp upsert(changeset, opts) do
    conflict_target = Keyword.fetch!(opts, :target)
    type = Ecto.Changeset.get_field(changeset, :type) || :note
    title = Ecto.Changeset.get_field(changeset, :title) || ""
    content = Ecto.Changeset.get_field(changeset, :content) || ""
    deleted_at = Ecto.Changeset.get_field(changeset, :deleted_at)
    updated_at = Ecto.Changeset.get_field(changeset, :updated_at)

    conflict_query =
      from(n in Note,
        update: [
          set: [
            type:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^updated_at,
                n.updated_at,
                ^type,
                n.type
              ),
            title:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^updated_at,
                n.updated_at,
                ^title,
                n.title
              ),
            content:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^updated_at,
                n.updated_at,
                ^content,
                n.content
              ),
            deleted_at:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^updated_at,
                n.updated_at,
                ^deleted_at,
                n.deleted_at
              ),
            updated_at:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^updated_at,
                n.updated_at,
                ^updated_at,
                n.updated_at
              )
          ]
        ]
      )

    Repo.insert(changeset,
      on_conflict: conflict_query,
      conflict_target: conflict_target,
      returning: true
    )
  end
end
