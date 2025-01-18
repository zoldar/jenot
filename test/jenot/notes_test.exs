defmodule Jenot.NotesTest do
  use Jenot.DataCase

  alias Jenot.Notes

  setup do
    Jenot.Accounts.new()
  end

  describe "add/2" do
    test "adds a new note", %{account: account} do
      now = DateTime.utc_now(:millisecond)
      timestamp = DateTime.to_unix(now, :millisecond)

      assert {:ok, note} =
               Notes.add(account, %{
                 "id" => "id_#{timestamp}",
                 "type" => "note",
                 "content" => "Example note body",
                 "reminder" => nil,
                 "created" => timestamp,
                 "updated" => timestamp,
                 "deleted" => nil
               })

      assert is_binary(note.id)
      assert note.internal_id == "id_#{timestamp}"
      assert DateTime.compare(now, note.updated_at) == :eq
    end

    test "adds a new tasklist note", %{account: account} do
      now = DateTime.utc_now(:millisecond)
      timestamp = DateTime.to_unix(now, :millisecond)

      assert {:ok, note} =
               Notes.add(account, %{
                 "id" => "id_#{timestamp}",
                 "type" => "tasklist",
                 "content" => [
                   %{checked: true, content: "First task"},
                   %{checked: false, content: "Second task"}
                 ],
                 "reminder" => nil,
                 "created" => timestamp,
                 "updated" => timestamp,
                 "deleted" => nil
               })

      assert is_binary(note.id)
      assert note.internal_id == "id_#{timestamp}"

      assert note.content ==
               Jason.encode!([
                 %{checked: true, content: "First task"},
                 %{checked: false, content: "Second task"}
               ])

      assert DateTime.compare(now, note.updated_at) == :eq
    end

    test "adds a new note with a reminder", %{account: account} do
      now = DateTime.utc_now(:millisecond)
      timestamp = DateTime.to_unix(now, :millisecond)

      assert {:ok, note} =
               Notes.add(account, %{
                 "id" => "id_#{timestamp}",
                 "type" => "note",
                 "content" => "Example note body",
                 "reminder" => %{
                   "enabled" => true,
                   "date" => "2025-04-01",
                   "time" => "13:00",
                   "repeat" => 1,
                   "unit" => nil
                 },
                 "created" => timestamp,
                 "updated" => timestamp,
                 "deleted" => nil
               })

      assert note.internal_id == "id_#{timestamp}"
      assert note.reminder.note_id == note.id
      assert note.reminder.date == ~D[2025-04-01]
      assert note.reminder.time == ~T[13:00:00]
    end
  end

  describe "serialize/1" do
    test "serializes note with a reminder", %{account: account} do
      now = DateTime.utc_now(:millisecond)
      timestamp = DateTime.to_unix(now, :millisecond)

      assert {:ok, note} =
               Notes.add(account, %{
                 "id" => "id_#{timestamp}",
                 "type" => "note",
                 "content" => "Example note body",
                 "reminder" => %{
                   "enabled" => true,
                   "date" => "2025-04-01",
                   "time" => "13:00",
                   "repeat" => 1,
                   "unit" => nil
                 },
                 "created" => timestamp,
                 "updated" => timestamp,
                 "deleted" => nil
               })

      serialized = Notes.serialize(note)

      assert serialized.id == note.internal_id
      assert serialized.reminder.date == "2025-04-01"
      assert serialized.reminder.time == "13:00"
    end
  end

  describe "all/0,1,2" do
    test "returns no notes for new account", %{account: account} do
      assert [] = Notes.all(account)
    end
  end
end
