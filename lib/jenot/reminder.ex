defmodule Jenot.Reminder do
  use Ecto.Schema

  @primary_key false
  schema "reminders" do
    field(:date, :date)
    field(:time, :time)
    field(:repeat, Ecto.Enum, values: [:day, :week, :month, :year])
    field(:unit, :integer)
    field(:enabled, :boolean)

    belongs_to(:note, Jenot.Note)

    timestamps(type: :utc_datetime_usec)
  end
end
