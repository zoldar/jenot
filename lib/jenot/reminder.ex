defmodule Jenot.Reminder do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  schema "reminders" do
    field(:date, :date)
    field(:time, :time)
    field(:day_of_week, :integer)
    field(:repeat_period, Ecto.Enum, values: [:day, :week, :month, :year])
    field(:repeat_count, :integer)

    belongs_to(:note, Jenot.Note)

    timestamps(type: :utc_datetime)
  end
end