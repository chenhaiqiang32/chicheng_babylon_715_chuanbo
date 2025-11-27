export interface ICommand {
    Execute(): void
    Undo(): void
}