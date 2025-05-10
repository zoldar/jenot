defmodule Jenot.Notes do
  import Ecto.Query

  alias Jenot.Note
  alias Jenot.Reminder
  alias Jenot.Repo

  def serialize(note) do
    serialize_note(note)
  end

  def latest_change(account) do
    Note
    |> where(account_id: ^account.id)
    |> select([n], max(n.server_updated_at))
    |> Repo.one()
    |> Repo.preload(:reminder)
  end

  def all(account, since \\ nil, include_deleted? \\ false) do
    Note
    |> where(account_id: ^account.id)
    |> maybe_include_deleted(include_deleted?)
    |> maybe_filter_since(since)
    |> Repo.all()
    |> Repo.preload(:reminder)
  end

  def add(account, params) do
    params = deserialize_params(params)
    note_changeset = Note.new(account, params)

    with {:ok, note} <- upsert_note(note_changeset, target: [:account_id, :internal_id]),
         reminder_changeset = Reminder.update(note, params["reminder"]),
         {:ok, reminder} <- upsert_reminder(reminder_changeset) do
      {:ok, %{note | reminder: reminder}}
    else
      {:error, _} ->
        {:error, :invalid_data}
    end
  end

  def note_by_internal_id(account, internal_id) do
    note =
      Note
      |> where(account_id: ^account.id)
      |> where(internal_id: ^internal_id)
      |> Repo.one()
      |> Repo.preload(:reminder)

    if note do
      {:ok, note}
    else
      {:error, :note_not_found}
    end
  end

  def update(account, internal_id, params) do
    params = deserialize_params(params)

    with {:ok, note} <- note_by_internal_id(account, internal_id) do
      note_changeset = Note.update(note, params)

      with {:ok, note} <- upsert_note(note_changeset, target: [:id]),
           reminder_changeset = Reminder.update(note, params["reminder"]),
           {:ok, reminder} <- upsert_reminder(reminder_changeset) do
        {:ok, %{note | reminder: reminder}}
      else
        {:error, _} -> {:error, :invalid_data}
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
      case Map.get(params, "content") do
        data when is_list(data) -> Map.put(params, "content", Jason.encode!(data))
        _ -> params
      end

    case Map.get(params, "id") do
      nil ->
        params

      internal_id ->
        params =
          params
          |> Map.delete("id")
          |> Map.put("internal_id", internal_id)
          |> deserialize_timestamp("deleted", "deleted_at")
          |> deserialize_timestamp("created", "inserted_at")
          |> deserialize_timestamp("updated", "updated_at")

        if reminder = params["reminder"] do
          reminder =
            reminder
            |> Map.put("inserted_at", params["inserted_at"])
            |> Map.put("updated_at", params["updated_at"])

          Map.put(params, "reminder", reminder)
        else
          params
        end
    end
  end

  defp serialize_note(note) do
    note =
      note
      |> Map.take([:title, :type, :content, :inserted_at, :updated_at, :deleted_at, :reminder])
      |> Map.put(:id, note.internal_id)
      |> serialize_timestamp(:deleted_at, :deleted)
      |> serialize_timestamp(:inserted_at, :created)
      |> serialize_timestamp(:updated_at, :updated)

    note =
      if note.type == :tasklist and not is_nil(note.content) do
        %{note | content: Jason.decode!(note.content)}
      else
        note
      end

    if reminder = note.reminder do
      time =
        reminder.time
        |> Time.to_string()
        |> String.split(":")
        |> Enum.take(2)
        |> Enum.join(":")

      reminder =
        reminder
        |> Map.take([:date, :time, :repeat, :unit, :enabled])
        |> Map.put(:date, Date.to_iso8601(reminder.date))
        |> Map.put(:time, time)

      %{note | reminder: reminder}
    else
      note
    end
  end

  defp deserialize_timestamp(params, src_key, dst_key) do
    value =
      case Map.get(params, src_key) do
        nil -> nil
        unix_time -> DateTime.from_unix!(unix_time, :millisecond)
      end

    params
    |> Map.delete(src_key)
    |> Map.put(dst_key, value)
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

    where(query, [n], n.server_updated_at > ^datetime)
  end

  defp upsert_reminder(nil), do: {:ok, nil}

  defp upsert_reminder(changeset) do
    reminder = Ecto.Changeset.apply_changes(changeset)

    conflict_query =
      from(r in Reminder,
        update: [
          set: [
            date:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^reminder.updated_at,
                r.updated_at,
                ^reminder.date,
                r.date
              ),
            time:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^reminder.updated_at,
                r.updated_at,
                ^reminder.time,
                r.time
              ),
            repeat:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^reminder.updated_at,
                r.updated_at,
                ^reminder.repeat,
                r.repeat
              ),
            unit:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^reminder.updated_at,
                r.updated_at,
                ^reminder.unit,
                r.unit
              ),
            enabled:
              fragment(
                "CASE WHEN ? > ? THEN ? ELSE ? END",
                ^reminder.updated_at,
                r.updated_at,
                type(^reminder.enabled, :boolean),
                type(r.enabled, :boolean)
              )
          ]
        ]
      )

    Repo.insert(changeset,
      on_conflict: conflict_query,
      conflict_target: [:note_id],
      returning: true
    )
  end

  defp upsert_note(changeset, opts) do
    conflict_target = Keyword.fetch!(opts, :target)
    type = to_string(Ecto.Changeset.get_field(changeset, :type) || :note)
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
            server_updated_at: ^DateTime.utc_now(),
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
