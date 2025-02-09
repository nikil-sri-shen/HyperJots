package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing notes
type SmartContract struct {
	contractapi.Contract
}

// Note represents a note object with a Title
type Note struct {
	NoteID int    `json:"noteID"` // Changed NoteID to int
	Owner  string `json:"owner"`
	Title  string `json:"title"`  // New Title field
	Content string `json:"content"`
}

// CreateNote adds a new note to the ledger with a title
func (s *SmartContract) CreateNote(ctx contractapi.TransactionContextInterface, title string, content string) (int, error) {
	// Generate the new noteID
	noteID, err := s.getNextNoteID(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to generate new note ID: %v", err)
	}

	// Get the client identity to set as the owner
	clientID, err := getClientID(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get client identity: %v", err)
	}

	// Create the new note
	note := Note{
		NoteID:  noteID,
		Owner:   clientID,
		Title:   title,
		Content: content,
	}

	// Serialize the note to JSON
	noteJSON, err := json.Marshal(note)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal note: %v", err)
	}

	// Save the note in the state
	err = ctx.GetStub().PutState(fmt.Sprintf("%d", noteID), noteJSON) // Save with string conversion for the key
	if err != nil {
		return 0, fmt.Errorf("failed to put note in the ledger: %v", err)
	}

	// Return the noteID that was generated
	return noteID, nil
}

// ReadNote retrieves a note from the ledger, ensuring only the owner can access it
func (s *SmartContract) ReadNote(ctx contractapi.TransactionContextInterface, noteID int) (*Note, error) {
	return s.getNoteIfAuthorized(ctx, noteID)
}

// UpdateNote updates an existing note in the ledger, ensuring only the owner can update it
func (s *SmartContract) UpdateNote(ctx contractapi.TransactionContextInterface, noteID int, title string, content string) error {
	note, err := s.getNoteIfAuthorized(ctx, noteID)
	if err != nil {
		return err
	}

	// Update the note title and content
	note.Title = title
	note.Content = content

	noteJSON, err := json.Marshal(note)
	if err != nil {
		return fmt.Errorf("failed to marshal updated note: %v", err)
	}

	// Update the note in the ledger
	return ctx.GetStub().PutState(fmt.Sprintf("%d", noteID), noteJSON) // Save with string conversion for the key
}

// DeleteNote removes a note from the ledger, ensuring only the owner can delete it
func (s *SmartContract) DeleteNote(ctx contractapi.TransactionContextInterface, noteID int) error {
	_, err := s.getNoteIfAuthorized(ctx, noteID)
	if err != nil {
		return err
	}

	// Delete the note from the ledger
	return ctx.GetStub().DelState(fmt.Sprintf("%d", noteID)) // Delete with string conversion for the key
}

// GetAllNotes retrieves all notes belonging to the invoking client
func (s *SmartContract) GetAllNotes(ctx contractapi.TransactionContextInterface) ([]*Note, error) {
	clientID, err := getClientID(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}

	// Retrieve all states in the ledger (this includes both notes and other data)
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get all notes: %v", err)
	}
	defer resultsIterator.Close()

	var notes []*Note
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Skip the "note_counter" key or any other non-note state
		if queryResponse.Key == "note_counter" {
			continue // Skip the counter
		}

		var note Note
		// Unmarshal the state value into a Note object
		err = json.Unmarshal(queryResponse.Value, &note)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal note data: %v", err)
		}

		// Only include notes that are owned by the client
		if note.Owner == clientID {
			notes = append(notes, &note)
		}
	}

	return notes, nil
}

// ResetNoteCounter resets the note counter to zero
func (s *SmartContract) ResetNoteCounter(ctx contractapi.TransactionContextInterface) error {
	counterKey := "note_counter"
	counter := 0

	// Marshal the counter and update the state
	counterJSON, err := json.Marshal(counter)
	if err != nil {
		return fmt.Errorf("failed to marshal note counter: %v", err)
	}

	err = ctx.GetStub().PutState(counterKey, counterJSON)
	if err != nil {
		return fmt.Errorf("failed to reset note counter: %v", err)
	}

	return nil
}

// GetNoteCounter retrieves the current value of the note counter
func (s *SmartContract) GetNoteCounter(ctx contractapi.TransactionContextInterface) (int, error) {
	counterKey := "note_counter"
	counterJSON, err := ctx.GetStub().GetState(counterKey)
	if err != nil {
		return 0, fmt.Errorf("failed to get note counter: %v", err)
	}

	var counter int
	if counterJSON == nil {
		return 0, nil // Counter is uninitialized
	}

	err = json.Unmarshal(counterJSON, &counter)
	if err != nil {
		return 0, fmt.Errorf("failed to unmarshal note counter: %v", err)
	}

	return counter, nil
}

// getNoteIfAuthorized retrieves a note and ensures the caller is the owner
func (s *SmartContract) getNoteIfAuthorized(ctx contractapi.TransactionContextInterface, noteID int) (*Note, error) {
	noteJSON, err := ctx.GetStub().GetState(fmt.Sprintf("%d", noteID))
	if err != nil {
		return nil, fmt.Errorf("failed to read note: %v", err)
	}
	if noteJSON == nil {
		return nil, fmt.Errorf("note with ID %d does not exist", noteID)
	}

	var note Note
	err = json.Unmarshal(noteJSON, &note)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal note: %v", err)
	}

	clientID, err := getClientID(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}

	if note.Owner != clientID {
		return nil, fmt.Errorf("access denied: you are not the owner of this note")
	}

	return &note, nil
}

// getClientID retrieves the client's unique identity
func getClientID(ctx contractapi.TransactionContextInterface) (string, error) {
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get client identity: %v", err)
	}
	return clientID, nil
}

// getNextNoteID generates a new noteID by incrementing a counter stored in the ledger
func (s *SmartContract) getNextNoteID(ctx contractapi.TransactionContextInterface) (int, error) {
	// Get the current counter value
	counterKey := "note_counter"
	counterJSON, err := ctx.GetStub().GetState(counterKey)
	if err != nil {
		return 0, fmt.Errorf("failed to get note counter: %v", err)
	}

	var counter int
	if counterJSON == nil {
		// Initialize the counter if it doesn't exist
		counter = 1
	} else {
		// Increment the counter
		err = json.Unmarshal(counterJSON, &counter)
		if err != nil {
			return 0, fmt.Errorf("failed to unmarshal note counter: %v", err)
		}
		counter++
	}

	// Save the updated counter back to the ledger
	counterJSON, err = json.Marshal(counter)
	if err != nil {
		return 0, fmt.Errorf("failed to marshal note counter: %v", err)
	}
	err = ctx.GetStub().PutState(counterKey, counterJSON)
	if err != nil {
		return 0, fmt.Errorf("failed to update note counter: %v", err)
	}

	// Return the new noteID as an integer
	return counter, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting chaincode: %v\n", err)
	}
}
